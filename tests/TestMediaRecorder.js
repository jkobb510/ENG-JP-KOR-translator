export class TestMediaRecorder {
  state = 'inactive';
  mimeType = 'audio/webm';

  start() {
    this.state = 'recording';
  }

  pause() {
    this.state = 'paused';
  }

  resume() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    this.ondataavailable({ data: new Blob(['audio']) });
    return this.onstop();
  }
}
