import type { I18nKey } from './ko';

export const en: Record<I18nKey, string> = {
  // Lobby
  lobby_title: '1:N Chess',
  lobby_subtitle: 'One host vs many challengers',
  your_name: 'Enter your name',
  create_room: 'Create Room',
  create_room_title: 'Room Name',
  create_room_placeholder: 'Enter room name',
  create_room_submit: 'Create',
  create_room_cancel: 'Cancel',
  available_rooms: 'Available Rooms',
  no_rooms: 'No rooms available.',
  refresh: 'Refresh',
  join: 'Join',
  challengers: 'challengers',
  host_color_label: 'Color',
  status_waiting: 'Waiting',
  status_playing: 'Playing',

  // GameRoom
  leave_room: 'Leave',
  waiting_for_host: 'Waiting for host to start the game...',
  host_color_select: 'Choose your color',
  color_white: 'White',
  color_black: 'Black',
  color_random: 'Random',
  start_game: 'Start Game',
  start_game_hint: 'Waiting for challengers to join',
  host_turn: "Host's turn",
  challenger_voting: 'Challengers are voting',
  voting_ends_in: 'Vote ends in',
  seconds: 's',
  your_vote: 'Your vote',
  vote_count: 'vote',

  // Game over
  game_over: 'Game Over',
  you_win: 'You Win!',
  you_lose: 'You Lose',
  draw: 'Draw',
  host_wins: 'Host Wins',
  challengers_win: 'Challengers Win',
  reason_checkmate: 'Checkmate',
  reason_stalemate: 'Stalemate',
  reason_fifty_move: '50-Move Rule',
  reason_threefold: 'Threefold Repetition',
  reason_insufficient: 'Insufficient Material',
  reason_disconnect: 'Disconnection',

  // Board
  check_warning: 'Check!',
  select_promotion: 'Pawn Promotion — Choose a piece',

  // PlayerList
  host_label: 'Host',
  challengers_label: 'Challengers',
  you: '(You)',

  // MoveHistory
  move_history: 'Move History',
  white: 'White',
  black: 'Black',

  // CapturedPieces
  captured_by_host: 'Host captured',
  captured_by_challengers: 'Challengers captured',
  material_advantage: 'Material',

  // Connection
  connecting: 'Connecting to server...',
  reconnecting: 'Reconnecting...',
};
