<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# 🎤 123노래자랑 - 로컬 실행 및 버셀(Vercel) 배포 가이드

이 저장소는 **123노래자랑** 애플리케이션의 프론트엔드 코드 및 Firebase 연결 시스템을 보관하고 있습니다. GitHub을 통해 Vercel로 쉽게 배포하고 서비스할 수 있습니다.

---

## ⚡ 로컬에서 실행하기

**준비 사항:** Node.js (18+ 버전 권장)

1. **패키지 의존성 설치:**
   ```bash
   npm install
   ```

2. **환경 변수 파일 생성:**
   `.env.example` 파일을 복사하여 `.env.local` 파일을 생성한 후 설정 내용을 확인합니다.

3. **개발 서버 실행:**
   ```bash
   npm run dev
   ```
   브라우저에서 `http://localhost:3000`에 접속하여 실행을 확인합니다.

---

## 🚀 GitHub 연동 및 버셀(Vercel) 배포 방법

이 프로젝트는 Vite 기반의 모던 React SPA 아키텍처로 이루어져 있어, Vercel에 단 몇 초 만에 무료배포 및 호스팅할 수 있습니다.

### 1단계: 내 GitHub 저장소로 코드 가져가기
1. AI Studio의 우측 상단 헤더 혹은 설정 메뉴에서 **GitHub으로 내보내기(Export to GitHub)** 기능 또는 ZIP 다운로드 기능을 사용하여 코드를 본인의 개인 GitHub 리포지토리에 푸시합니다.

### 2단계: Vercel에서 프로젝트 연동
1. [Vercel](https://vercel.com/) 홈페이지에 가입/로그인합니다.
2. Vercel 대시보드에서 **[Add New...] -> [Project]**를 선택합니다.
3. 방금 Push한 GitHub 저장소를 선택하고 **[Import]**를 클릭합니다.

### 3단계: 환경 변수(Environment Variables) 설정 (매우 중요 ⭐)
Vercel 배포 시, Firebase 데이터베이스 접근에 문제가 없도록 설정 과정을 거칩니다.
프로젝트 설정 패널의 **[Environment Variables]** 탭에서 아래의 변수들을 입력해 줍니다:

| 환경 변수 Key | 설정할 Value |
| :--- | :--- |
| **VTE_FIREBASE_PROJECT_ID** | `marklar-surf-fsjh2` |
| **VITE_FIREBASE_APP_ID** | `1:250423559161:web:c426bf86f710a3fb75f328` |
| **VITE_FIREBASE_API_KEY** | `AIzaSyB7aFm7i3JuY-peXje0t9C0rqJVYRXkweU` |
| **VITE_FIREBASE_AUTH_DOMAIN** | `marklar-surf-fsjh2.firebaseapp.com` |
| **VITE_FIREBASE_FIRESTORE_DATABASE_ID** | `ai-studio-e2218678-8a5e-4a9c-9d63-6e88cdf2d3f1` |
| **VITE_FIREBASE_STORAGE_BUCKET** | `marklar-surf-fsjh2.firebasestorage.app` |
| **VITE_FIREBASE_MESSAGING_SENDER_ID** | `250423559161` |

> 💡 **안내:** 설정하지 않더라도 소스코드와 함께 푸시된 `firebase-applet-config.json`을 사용하여 자동으로 이중 폴백 작동하므로 원활히 배포됩니다. 단, 보안 상의 이유로 json 파일을 형상 관리에 업로드하기 원하지 않거나 추후 데이터베이스 프로젝트를 별도로 마이그레이션해야 할 때는 위 환경 변수 입력을 이용해 커스텀 지정하시는 것을 강력히 권장합니다.

### 4단계: 빌드 및 완료
* **Framework Preset:** `Vite`로 자동 감지됩니다.
* **Build Command:** `npm run build`
* **Output Directory:** `dist`
* 모든 설정이 완료되었다면 하단의 **[Deploy]** 버튼을 클릭하여 버셀 주소로 최종 배포를 마무리합니다.

---

## 🛠️ 구조적 특징 및 편의성 설계

- **vercel.json 설정 완료:** SPA 라우팅 호환을 보장하여 브라우저 새로고침이나 경로 이동 시 `404 Not Found` 에러가 발생하는 현상을 방지하였습니다.
- **이미지 자동 압축 및 리사이징:** 사용자가 노래자랑 커스텀 로고 등을 고화질 이미지 데이터로 등록 및 원격 Firestore에 저장할 시, 용량 슬롭을 차단하기 위해 600px 스케일링 리사이즈 및 jpeg 75% 무손실급 경량 압축을 적용하여 빠른 실시간 렌더링 속도와 용량 쿼터 최적화를 보장합니다.
