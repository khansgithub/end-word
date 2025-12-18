type GameState = {
  a?: string
  b: string
}

type RequiredIfRequired<T> =
  T extends Required<GameState> ? Required<GameState> : GameState

export function gameStateReducer<T extends GameState>(state: T, action: any): RequiredIfRequired<T> {
  // reducer logic here
  return {
    a: state.a ?? "default",
    b: state.b,
  } as RequiredIfRequired<T>
}
