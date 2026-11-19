/**
 * The room's join link, for the QR codes: the phone's camera opens it, and Android opens the app
 * in the room (routes/word-seed/join/). Next to the TV page, so a local test links locally.
 */
export const joinLink = (code: string) => `${new URL('../join/', location.href).href}?code=${code}`;
