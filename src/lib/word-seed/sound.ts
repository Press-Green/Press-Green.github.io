import timesUpMp3 from './sounds/times-up.mp3';
import timesUpOgg from './sounds/times-up.ogg';
import countdownMp3 from './sounds/countdown.mp3';
import countdownOgg from './sounds/countdown.ogg';
import tickMp3 from './sounds/tick.mp3';
import tickOgg from './sounds/tick.ogg';
import winnerMp3 from './sounds/winner.mp3';
import winnerOgg from './sounds/winner.ogg';
import chipsMp3 from './sounds/chips.mp3';
import chipsOgg from './sounds/chips.ogg';
import tileMp3 from './sounds/tile.mp3';
import tileOgg from './sounds/tile.ogg';
import foundMp3 from './sounds/word-found.mp3';
import foundOgg from './sounds/word-found.ogg';
import cheerMp3 from './sounds/cheer.mp3';
import cheerOgg from './sounds/cheer.ogg';

/**
 * Short sound effects through Web Audio: each play starts a new source, so quick repeats overlap
 * instead of cutting each other off. Browsers keep audio locked until someone interacts with the
 * page (a key, a click, the remote), so sounds before that stay silent.
 */

const SOURCES = {
	/** The results: each letter of the word being replayed, as its tile is pressed (the app's own sound). */
	tile: { ogg: tileOgg, mp3: tileMp3 },
	/** A stack of chips: tried for the letters of the results' replay, not used for now. */
	chips: { ogg: chipsOgg, mp3: chipsMp3 },
	/** The results: the word replayed turns green (the app's own sound). */
	found: { ogg: foundOgg, mp3: foundMp3 },
	/** Each number of the countdown before a match. */
	countdown: { ogg: countdownOgg, mp3: countdownMp3 },
	/** The match clock at 5, 4, 3, 2 and 1 seconds left. */
	tick: { ogg: tickOgg, mp3: tickMp3 },
	/** The winner's gold star appears in the results. */
	winner: { ogg: winnerOgg, mp3: winnerMp3 },
	/** The results' podium: the crowd cheers as the winner lands on the top step. */
	cheer: { ogg: cheerOgg, mp3: cheerMp3 },
	/** Time's up: the match clock at 0. */
	timesUp: { ogg: timesUpOgg, mp3: timesUpMp3 }
} as const;

export type SoundName = keyof typeof SOURCES;

let context: AudioContext | null = null;
const buffers = new Map<SoundName, Promise<AudioBuffer | null>>();

/** The page's one audio context, shared with the music (music.ts). */
export function audio() {
	if (!context && typeof AudioContext === 'function') {
		context = new AudioContext();
		// The first interaction unlocks audio for the rest of the visit.
		const unlock = () => {
			context?.resume().catch(() => {});
			if (context?.state === 'running') {
				for (const type of events) removeEventListener(type, unlock, true);
			}
		};
		const events = ['pointerdown', 'keydown', 'touchend'] as const;
		for (const type of events) addEventListener(type, unlock, true);
	}
	return context;
}

/** OGG where the browser plays Vorbis, MP3 elsewhere (older Safari). */
function urlOf(name: SoundName) {
	const { ogg, mp3 } = SOURCES[name];
	return new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? ogg : mp3;
}

/** Downloads and decodes a sound once; later calls share the result. */
export function preload(name: SoundName) {
	const ctx = audio();
	if (!ctx) return Promise.resolve(null);
	let buffer = buffers.get(name);
	if (!buffer) {
		buffer = fetch(urlOf(name))
			.then((response) => response.arrayBuffer())
			.then((data) => ctx.decodeAudioData(data))
			.catch(() => null);
		buffers.set(name, buffer);
	}
	return buffer;
}

/** Plays a sound now, or not at all if it isn't ready or audio is still locked. */
export function play(name: SoundName, volume = 1) {
	const ctx = audio();
	if (!ctx) return;
	if (ctx.state === 'suspended') ctx.resume().catch(() => {});
	preload(name).then((buffer) => {
		if (!buffer || ctx.state !== 'running') return;
		const source = ctx.createBufferSource();
		source.buffer = buffer;
		const gain = ctx.createGain();
		gain.gain.value = volume;
		source.connect(gain).connect(ctx.destination);
		source.start();
	});
}
