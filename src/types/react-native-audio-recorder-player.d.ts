// types/react-native-audio-recorder-player.d.ts

declare module 'react-native-audio-recorder-player' {
  export interface RecordBackType {
    currentPosition: number;
    currentMetering?: number;
  }

  export interface PlayBackType {
    currentPosition: number;
    duration: number;
  }

  export default class AudioRecorderPlayer {
    constructor();
    
    startRecorder(
      path?: string,
      audioSet?: any,
      meteringEnabled?: boolean
    ): Promise<string>;
    
    stopRecorder(): Promise<string>;
    
    startPlayer(path?: string): Promise<string>;
    
    stopPlayer(): Promise<string>;
    
    pausePlayer(): Promise<string>;
    
    resumePlayer(): Promise<string>;
    
    addRecordBackListener(callback: (e: RecordBackType) => void): void;
    
    removeRecordBackListener(): void;
    
    addPlayBackListener(callback: (e: PlayBackType) => void): void;
    
    removePlayBackListener(): void;
    
    setVolume(volume: number): Promise<void>;
  }
}