# 디지털 오르리 · 펀딩 구매자 앱

AI 동화책 클래스 구매자를 위한 이메일 명단 확인 화면과 상담 소개 페이지입니다.

## 실행

Node.js 22 이상에서 실행합니다.

```sh
node --env-file-if-exists=.env server.mjs
```

브라우저에서 `http://127.0.0.1:4173`을 엽니다. Windows에서는 `앱실행.cmd`를 더블클릭해도 됩니다.

## 구성

- `dist/index.html`: 랜딩페이지와 구매자 이메일 입력
- `dist/contact.html`: 상담 소개와 전화 연결
- `dist/style.css`, `dist/app.js`: 디자인과 화면 동작
- `server.mjs`: 서버에서 구매자 명단 대조 및 이메일 인증

현재 화면은 수업 전 미리보기 모드입니다. 입력한 이메일을 서버의 구매자 명단과 대조하며 실제 인증메일은 발송하지 않습니다. 명단 대조만으로 이메일 소유가 증명되지는 않습니다.

## 비공개 설정

구매자 명단과 계정 정보는 GitHub에 올리지 않습니다. 배포 서버에만 `private-data/buyers.json`과 `.env`를 설정합니다. 명단은 다음 형식의 배열입니다.

```json
[{"email":"buyer@example.com","payment_number":"00000000","status":"완료"}]
```

환불 제외 설정은 비공개 `private-data/인증제외목록.json`에 둡니다. 강의는 비공개 `private-data/lessons.json`에서 관리합니다.

실제 이메일 인증으로 전환할 때는 `.env.example`을 참고해 발송 계정과 HTTPS 도메인을 설정하고, 개인정보 안내를 확정한 뒤 화면의 미리보기 모드도 전환해야 합니다. 메모리 세션은 서버 재시작 시 초기화됩니다.

## 호스팅

GitHub는 소스 보관용입니다. GitHub Pages는 정적 화면만 제공하므로 구매자 명단 대조와 이메일 인증 서버를 실행할 수 없습니다. 전체 기능은 Node.js 서버를 지원하는 호스팅이 필요합니다.
