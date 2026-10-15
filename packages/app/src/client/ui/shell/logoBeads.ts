/**
 * 헤더 로고와 favicon에 놓는 구슬입니다. 왼쪽 위부터 2열로 채웁니다.
 * favicon은 CSS 변수를 읽지 못해 색을 hex로 함께 적고, 이 값은 theme.css의 같은 이름 변수와 같아야 합니다.
 */
export const LOGO_BEADS = [
  { tone: "tone-azure", color: "#bedafe" },
  { tone: "tone-lilac", color: "#e6cdf2" },
  { tone: "tone-mint", color: "#a7f3d1" },
  { tone: "tone-sand", color: "#fee1b9" },
] as const;
