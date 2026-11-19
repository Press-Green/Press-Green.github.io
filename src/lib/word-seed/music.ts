import { audio } from './sound.ts';
import totalWar1 from './music/total-war-1.mp3';
import totalWar2 from './music/total-war-2.mp3';

/**
 * The match music: one track picked at random, then the other when it ends, so a long match
 * never hears the same track twice in a row. Streamed through <audio> (no big download before it
 * starts) into the shared audio context, where a gain node does the fades.
 */

const TRACKS = [totalWar1, totalWar2];
/** Under the sound effects, which play at 0.7–0.9. */
const VOLUME = 0.5;

type Player = { element: HTMLAudioElement; gain: GainNode };
let player: Player | null = null;
let played = false;

function ensurePlayer(): Player | null {
	if (player) return player;
	const ctx = audio();
	if (!ctx) return null;
	const element = new Audio();
	element.preload = 'auto';
	const gain = ctx.createGain();
	gain.gain.value = 0;
	ctx.createMediaElementSource(element).connect(gain).connect(ctx.destination);
	// Next track when one ends.
	element.addEventListener('ended', () => {
		const next = (TRACKS.indexOf(element.dataset.track!) + 1) % TRACKS.length;
		load(element, next);
		element.play().catch(() => {});
	});
	player = { element, gain };
	return player;
}

function load(element: HTMLAudioElement, index: number) {
	element.dataset.track = TRACKS[index];
	element.src = TRACKS[index];
}

/** Fetches a track early, so the music starts on time when the match does. */
export function preloadMusic() {
	const p = ensurePlayer();
	if (p && !p.element.src) load(p.element, Math.floor(Math.random() * TRACKS.length));
}

/** Starts the music from the top of a random track, fading in. */
export function startMusic() {
	const p = ensurePlayer();
	if (!p) return;
	const ctx = p.gain.context as AudioContext;
	if (ctx.state === 'suspended') ctx.resume().catch(() => {});
	// The first match plays the track preloaded with the page; later ones pick again.
	if (!p.element.src || played) load(p.element, Math.floor(Math.random() * TRACKS.length));
	played = true;
	p.element.currentTime = 0;
	p.gain.gain.cancelScheduledValues(ctx.currentTime);
	p.gain.gain.setValueAtTime(0, ctx.currentTime);
	ramp(p, VOLUME, 0.4);
	p.element.play().catch(() => {});
}

/** Lowers or restores the music, `level` from 0 to 1 of its normal volume. */
export function duckMusic(level: number, seconds = 0.4) {
	if (player && !player.element.paused) ramp(player, VOLUME * level, seconds);
}

/** Fades the music out, then pauses it. */
export function stopMusic(seconds = 1.2) {
	const p = player;
	if (!p || p.element.paused) return;
	ramp(p, 0, seconds);
	const element = p.element;
	window.setTimeout(() => {
		// Unless a new match started it again meanwhile.
		if (p.gain.gain.value < 0.01) element.pause();
	}, seconds * 1000 + 50);
}

function ramp({ gain }: Player, value: number, seconds: number) {
	const now = gain.context.currentTime;
	gain.gain.cancelScheduledValues(now);
	gain.gain.setValueAtTime(gain.gain.value, now);
	gain.gain.linearRampToValueAtTime(value, now + seconds);
}
