export const ko = {
  // Lobby
  lobby_title: '1:N 체스',
  lobby_subtitle: '한 명의 호스트 vs 다수의 도전자',
  your_name: '이름을 입력하세요',
  create_room: '방 만들기',
  create_room_title: '방 이름',
  create_room_placeholder: '방 이름을 입력하세요',
  create_room_submit: '방 생성',
  create_room_cancel: '취소',
  available_rooms: '참가 가능한 방',
  no_rooms: '참가 가능한 방이 없습니다.',
  refresh: '새로고침',
  join: '참가',
  challengers: '도전자',
  host_color_label: '색상',
  status_waiting: '대기 중',
  status_playing: '진행 중',

  // GameRoom
  leave_room: '방 나가기',
  waiting_for_host: '호스트가 게임을 시작하기를 기다리고 있습니다...',
  host_color_select: '색상 선택',
  color_white: '백 (흰색)',
  color_black: '흑 (검은색)',
  color_random: '랜덤',
  start_game: '게임 시작',
  start_game_hint: '도전자가 참가한 후 시작할 수 있습니다',
  host_turn: '호스트 차례',
  challenger_voting: '도전자 투표 중',
  voting_ends_in: '투표 종료까지',
  seconds: '초',
  your_vote: '나의 투표',
  vote_count: '표',

  // Game over
  game_over: '게임 종료',
  you_win: '승리!',
  you_lose: '패배',
  draw: '무승부',
  host_wins: '호스트 승리',
  challengers_win: '도전자 승리',
  reason_checkmate: '체크메이트',
  reason_stalemate: '스테일메이트 (무승부)',
  reason_fifty_move: '50수 규칙 (무승부)',
  reason_threefold: '3회 반복 (무승부)',
  reason_insufficient: '기물 부족 (무승부)',
  reason_disconnect: '연결 끊김',

  // Board
  check_warning: '체크!',
  select_promotion: '폰 승진 — 기물 선택',

  // PlayerList
  host_label: '호스트',
  challengers_label: '도전자',
  you: '(나)',

  // MoveHistory
  move_history: '기보',
  white: '백',
  black: '흑',

  // CapturedPieces
  captured_by_host: '호스트 획득',
  captured_by_challengers: '도전자 획득',
  material_advantage: '기물 이점',

  // Connection
  connecting: '서버에 연결 중...',
  reconnecting: '재연결 중...',
} as const;

export type I18nKey = keyof typeof ko;
