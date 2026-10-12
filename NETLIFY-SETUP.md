# Netlify 연결

1. Netlify에서 GitHub의 `orli99165597-ops/peonding-chamyeoja` 저장소를 가져옵니다.
2. `netlify.toml`이 배포 폴더와 Functions 폴더를 지정합니다. Publish directory는 `dist`, Functions directory는 `netlify/functions`입니다.
3. 프로젝트의 Environment variables에서 `BUYER_EMAILS_JSON`을 추가합니다. Functions 범위가 있으면 포함합니다.
4. 값에는 작업 PC의 `private-data/Netlify환경변수_값.txt` 내용을 그대로 붙여 넣습니다. 이 파일은 공개 저장소에 올리지 않습니다.
5. 저장한 뒤 새 배포를 실행합니다.

배포가 끝나면 해당 Netlify 주소에서 이메일 명단 확인과 빨간 오류 안내를 사용할 수 있습니다. 명단 확인은 이메일 소유 인증이 아닙니다. 현재는 수업 전 미리보기 모드이며, 실제 혜택 자료와 이메일 본인 인증은 별도로 연결해야 합니다.

Functions를 함께 배포하려면 GitHub 연결 방식을 사용하세요. 정적 폴더를 끌어놓는 배포만으로는 Functions가 배포되지 않습니다.
