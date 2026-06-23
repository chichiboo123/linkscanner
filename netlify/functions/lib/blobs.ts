import { getStore, type Store } from '@netlify/blobs'

// Netlify Blobs 스토어 초기화 공통 헬퍼.
// 환경변수에 siteID/token 이 있으면 명시 모드를 우선 사용한다.
// (자동 모드 getStore(name) 은 생성 시점엔 에러를 내지 않고 실제 읽기/쓰기 시점에
//  "환경 미설정" 에러를 던지므로, 명시 모드를 우선해야 안정적이다.)
export function resolveStore(name: string): Store {
  const siteID =
    process.env.NETLIFY_BLOBS_SITE_ID || process.env.SITE_ID || process.env.NETLIFY_SITE_ID
  const token = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_API_TOKEN

  if (siteID && token) {
    return getStore({ name, siteID, token })
  }
  return getStore(name)
}
