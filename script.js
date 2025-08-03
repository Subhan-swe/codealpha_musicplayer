class AudioPlayer {
    constructor() {
        this.audio = document.getElementById('audio-player');
        this.progressBar = document.getElementById('progress-bar');
        this.currentTime = document.getElementById('current-time');
        this.duration = document.getElementById('duration');
        this.volumeSlider = document.getElementById('volume-slider');
        this.currentTrack = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.progressBar.addEventListener('input', () => this.seek());
        this.volumeSlider.addEventListener('input', () => this.setVolume());
    }

    playTrack(track) {
        this.currentTrack = track;
        this.audio.src = track.url;
        this.audio.play();
        this.updateTrackInfo();
    }

    play() {
        if (this.currentTrack) {
            this.audio.play();
        }
    }

    pause() {
        this.audio.pause();
    }

    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
    }

    next(tracks) {
        if (!this.currentTrack) return;
        const currentIndex = tracks.findIndex(t => t.url === this.currentTrack.url);
        const nextIndex = (currentIndex + 1) % tracks.length;
        this.playTrack(tracks[nextIndex]);
    }

    previous(tracks) {
        if (!this.currentTrack) return;
        const currentIndex = tracks.findIndex(t => t.url === this.currentTrack.url);
        const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
        this.playTrack(tracks[prevIndex]);
    }

    updateProgress() {
        if (this.audio.duration) {
            const progress = (this.audio.currentTime / this.audio.duration) * 100;
            this.progressBar.value = progress;
            this.currentTime.textContent = this.formatTime(this.audio.currentTime);
        }
    }

    updateDuration() {
        this.duration.textContent = this.formatTime(this.audio.duration);
    }

    seek() {
        if (this.audio.duration) {
            const time = (this.progressBar.value / 100) * this.audio.duration;
            this.audio.currentTime = time;
        }
    }

    setVolume() {
        this.audio.volume = this.volumeSlider.value;
    }

    formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    updateTrackInfo() {
        document.getElementById('track-title').textContent = this.currentTrack.title || 'Unknown Track';
        document.getElementById('track-artist').textContent = this.currentTrack.artist || 'Unknown Artist';
    }
}

class PlaylistManager {
    constructor() {
        this.playlists = JSON.parse(localStorage.getItem('playlists')) || [];
        this.tracks = [];
        this.currentPlaylist = null;
    }

    addTrack(file) {
        const track = {
            url: URL.createObjectURL(file),
            title: file.name.replace(/\.[^/.]+$/, ''),
            artist: 'Unknown',
            genre: 'Unknown'
        };
        this.tracks.push(track);
        this.savePlaylists();
        return track;
    }

    createPlaylist(name) {
        const playlist = { id: Date.now(), name, tracks: [] };
        this.playlists.push(playlist);
        this.savePlaylists();
        return playlist;
    }

    addTrackToPlaylist(playlistId, track) {
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (playlist && !playlist.tracks.some(t => t.url === track.url)) {
            playlist.tracks.push(track);
            this.savePlaylists();
        }
    }

    removeTrackFromPlaylist(playlistId, trackUrl) {
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (playlist) {
            playlist.tracks = playlist.tracks.filter(t => t.url !== trackUrl);
            this.savePlaylists();
        }
    }

    deletePlaylist(playlistId) {
        this.playlists = this.playlists.filter(p => p.id !== playlistId);
        if (this.currentPlaylist?.id === playlistId) {
            this.currentPlaylist = null;
        }
        this.savePlaylists();
    }

    savePlaylists() {
        localStorage.setItem('playlists', JSON.stringify(this.playlists));
    }

    searchTracks(query) {
        query = query.toLowerCase();
        return this.tracks.filter(track =>
            track.title.toLowerCase().includes(query) ||
            track.artist.toLowerCase().includes(query) ||
            track.genre.toLowerCase().includes(query)
        );
    }
}

class UI {
    constructor(audioPlayer, playlistManager) {
        this.audioPlayer = audioPlayer;
        this.playlistManager = playlistManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('play-pause-btn').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('stop-btn').addEventListener('click', () => this.audioPlayer.stop());
        document.getElementById('next-btn').addEventListener('click', () => this.audioPlayer.next(this.getCurrentTracks()));
        document.getElementById('prev-btn').addEventListener('click', () => this.audioPlayer.previous(this.getCurrentTracks()));
        document.getElementById('file-input').addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('new-playlist-btn').addEventListener('click', () => this.createPlaylist());
        document.getElementById('search-input').addEventListener('input', (e) => this.searchTracks(e.target.value));
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
    }

    togglePlayPause() {
        const btn = document.getElementById('play-pause-btn');
        if (this.audioPlayer.audio.paused) {
            this.audioPlayer.play();
            btn.textContent = '⏸';
        } else {
            this.audioPlayer.pause();
            btn.textContent = '▶️';
        }
    }

    handleFileUpload(event) {
        const files = Array.from(event.target.files);
        files.forEach(file => {
            const track = this.playlistManager.addTrack(file);
            this.renderTracks();
            if (this.playlistManager.currentPlaylist) {
                this.playlistManager.addTrackToPlaylist(this.playlistManager.currentPlaylist.id, track);
                this.renderPlaylistTracks();
            }
        });
    }

    createPlaylist() {
        const name = prompt('Enter playlist name:');
        if (name) {
            this.playlistManager.createPlaylist(name);
            this.renderPlaylists();
        }
    }

    renderPlaylists() {
        const playlistList = document.getElementById('playlist-list');
        playlistList.innerHTML = '';
        this.playlistManager.playlists.forEach(playlist => {
            const li = document.createElement('li');
            li.textContent = playlist.name;
            li.addEventListener('click', () => {
                this.playlistManager.currentPlaylist = playlist;
                this.renderPlaylistTracks();
            });
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playlistManager.deletePlaylist(playlist.id);
                this.renderPlaylists();
                this.renderPlaylistTracks();
            });
            li.appendChild(deleteBtn);
            playlistList.appendChild(li);
        });
    }

    renderTracks() {
        const trackList = document.getElementById('track-list');
        trackList.innerHTML = '';
        this.playlistManager.tracks.forEach(track => {
            const li = document.createElement('li');
            li.textContent = `${track.title} - ${track.artist}`;
            li.addEventListener('click', () => {
                this.audioPlayer.playTrack(track);
                document.getElementById('play-pause-btn').textContent = '⏸';
            });
            if (this.playlistManager.currentPlaylist) {
                const addBtn = document.createElement('button');
                addBtn.textContent = 'Add';
                addBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.playlistManager.addTrackToPlaylist(this.playlistManager.currentPlaylist.id, track);
                    this.renderPlaylistTracks();
                });
                li.appendChild(addBtn);
            }
            trackList.appendChild(li);
        });
    }

    renderPlaylistTracks() {
        const trackList = document.getElementById('track-list');
        trackList.innerHTML = '';
        if (this.playlistManager.currentPlaylist) {
            this.playlistManager.currentPlaylist.tracks.forEach(track => {
                const li = document.createElement('li');
                li.textContent = `${track.title} - ${track.artist}`;
                li.addEventListener('click', () => {
                    this.audioPlayer.playTrack(track);
                    document.getElementById('play-pause-btn').textContent = '⏸';
                });
                const removeBtn = document

.createElement('button');
                removeBtn.textContent = 'Remove';
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.playlistManager.removeTrackFromPlaylist(this.playlistManager.currentPlaylist.id, track.url);
                    this.renderPlaylistTracks();
                });
                li.appendChild(removeBtn);
                trackList.appendChild(li);
            });
        } else {
            this.renderTracks();
        }
    }

    searchTracks(query) {
        const filteredTracks = this.playlistManager.searchTracks(query);
        const trackList = document.getElementById('track-list');
        trackList.innerHTML = '';
        filteredTracks.forEach(track => {
            const li = document.createElement('li');
            li.textContent = `${track.title} - ${track.artist}`;
            li.addEventListener('click', () => {
                this.audioPlayer.playTrack(track);
                document.getElementById('play-pause-btn').textContent = '⏸';
            });
            trackList.appendChild(li);
        });
    }

    getCurrentTracks() {
        return this.playlistManager.currentPlaylist?.tracks || this.playlistManager.tracks;
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    }

    loadTheme() {
        const theme = localStorage.getItem('theme');
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const audioPlayer = new AudioPlayer();
    const playlistManager = new PlaylistManager();
    const ui = new UI(audioPlayer, playlistManager);

    ui.loadTheme();
    ui.renderPlaylists();
    ui.renderTracks();

    // Trigger file input click when adding tracks
    document.getElementById('track-list').addEventListener('contextmenu', (e) => {
        e.preventDefault();
        document.getElementById('file-input').click();
    });
});