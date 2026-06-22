// GitHub 레포지토리 메타데이터 + 핵심 소스코드 수집
// Personal Access Token(GITHUB_TOKEN)이 있으면 rate limit 완화 및 비공개 레포 접근 가능.

export interface RepoResult {
  ok: boolean
  summary: string
  /** 분석용으로 직렬화한 소스 묶음 */
  sources: string
  error?: string
}

const API = 'https://api.github.com'
const MAX_TOTAL_SOURCE = 60000 // 전체 소스 수집 상한(문자)
const MAX_FILE = 12000 // 파일당 상한(문자)
const MAX_FILES = 12 // 최대 파일 수

// 우선 수집할 설정/엔트리 파일
const PRIORITY_FILES = [
  'package.json',
  'README.md',
  'readme.md',
  'index.html',
  'vite.config.ts',
  'vite.config.js',
  'next.config.js',
  'tsconfig.json',
  'requirements.txt',
  'pyproject.toml',
  'Dockerfile',
  'netlify.toml',
]

// 소스로 간주할 확장자
const SOURCE_EXT = /\.(tsx?|jsx?|vue|svelte|py|go|rb|java|kt|php|rs|css|scss)$/i
// 분석에서 제외할 경로
const IGNORE = /(^|\/)(node_modules|dist|build|\.next|vendor|\.git|coverage|public\/assets)\//i

interface GitTreeItem {
  path: string
  type: string
  size?: number
}

function parseRepo(input: string): { owner: string; repo: string } | null {
  const m = input.match(/github\.com[/:]([^/]+)\/([^/#?]+)/i)
  if (!m) return null
  return { owner: m[1], repo: m[2].replace(/\.git$/, '') }
}

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'LinkScanner/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

export async function collectRepo(repoUrl: string, token?: string): Promise<RepoResult> {
  const parsed = parseRepo(repoUrl)
  if (!parsed) {
    return { ok: false, summary: '', sources: '', error: 'GitHub 레포 주소를 해석할 수 없습니다.' }
  }
  const { owner, repo } = parsed
  const h = headers(token)

  try {
    // 1) 레포 메타
    const repoRes = await fetch(`${API}/repos/${owner}/${repo}`, { headers: h })
    if (!repoRes.ok) {
      return {
        ok: false,
        summary: '',
        sources: '',
        error: `레포 정보를 가져오지 못했습니다 (HTTP ${repoRes.status}). 주소/공개여부/토큰을 확인하세요.`,
      }
    }
    const meta = await repoRes.json()
    const branch = meta.default_branch || 'main'

    // 2) 언어 구성
    const langRes = await fetch(`${API}/repos/${owner}/${repo}/languages`, { headers: h })
    const langs = langRes.ok ? await langRes.json() : {}

    const summary = [
      `레포: ${owner}/${repo}`,
      `설명: ${meta.description || '(없음)'}`,
      `주요 언어: ${meta.language || '미상'} / 구성: ${Object.keys(langs).join(', ') || '미상'}`,
      `스타: ${meta.stargazers_count} · 포크: ${meta.forks_count} · 기본 브랜치: ${branch}`,
      `토픽: ${(meta.topics || []).join(', ') || '(없음)'}`,
      `최근 푸시: ${meta.pushed_at}`,
    ].join('\n')

    // 3) 파일 트리
    const treeRes = await fetch(
      `${API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers: h },
    )
    if (!treeRes.ok) {
      return { ok: true, summary, sources: '(파일 트리를 가져오지 못해 메타데이터만 분석합니다.)' }
    }
    const tree = await treeRes.json()
    const files: GitTreeItem[] = (tree.tree || []).filter(
      (t: GitTreeItem) => t.type === 'blob' && !IGNORE.test('/' + t.path),
    )

    // 4) 수집 대상 선별: 우선파일 → 소스파일(작은 것부터)
    const priority = files.filter((f) =>
      PRIORITY_FILES.some((p) => f.path === p || f.path.endsWith('/' + p)),
    )
    const sourceFiles = files
      .filter((f) => SOURCE_EXT.test(f.path) && !priority.includes(f))
      .sort((a, b) => (a.size || 0) - (b.size || 0))

    const selected: GitTreeItem[] = []
    const seen = new Set<string>()
    for (const f of [...priority, ...sourceFiles]) {
      if (selected.length >= MAX_FILES) break
      if (seen.has(f.path)) continue
      seen.add(f.path)
      selected.push(f)
    }

    // 5) 파일 내용 수집 (raw)
    let total = 0
    const chunks: string[] = []
    for (const f of selected) {
      if (total >= MAX_TOTAL_SOURCE) break
      const rawRes = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${f.path}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      )
      if (!rawRes.ok) continue
      let content = await rawRes.text()
      content = content.slice(0, MAX_FILE)
      total += content.length
      chunks.push(`\n===== FILE: ${f.path} =====\n${content}`)
    }

    return {
      ok: true,
      summary,
      sources:
        `전체 파일 수(필터 후): ${files.length} · 수집한 파일: ${chunks.length}\n` +
        `전체 파일 목록(상위 60):\n${files
          .slice(0, 60)
          .map((f) => f.path)
          .join('\n')}\n\n--- 수집된 소스 ---${chunks.join('\n')}`,
    }
  } catch (e) {
    return {
      ok: false,
      summary: '',
      sources: '',
      error: e instanceof Error ? e.message : 'GitHub 수집 중 알 수 없는 오류',
    }
  }
}
