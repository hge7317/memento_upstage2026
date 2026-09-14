const { execSync } = require("child_process");

// Turbopack 관련 오류 회피를 위한 webpack 기반 빌드
try {
  const result = execSync("npx webpack --mode production", {
    cwd: __dirname,
    stdio: "inherit",
  });
  console.log("빌드 성공");
} catch (e) {
  console.error("빌드 실패:", e.message);
  process.exit(1);
}
