import { Component, ElementRef, ViewChild, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl'; // Add this
import '@tensorflow/tfjs-backend-cpu'; // Add this as a fallback
import * as poseDetection from '@tensorflow-models/pose-detection';

@Component({
  selector: 'jump-counter',
  imports: [CommonModule],
  templateUrl: './jump-counter.html',
  styleUrl: './jump-counter.scss',
})
export class JumpCounter implements AfterViewInit {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  jumpCount: number = 0;
  isLoading: boolean = true;
  isCameraActive: boolean = false;

  // Logic variables
  private detector: any;
  private isJumping: boolean = false;
  private initialHipY: number | null = null;
  private JUMP_THRESHOLD = 30; // Pixels the hips must move UP to count as a jump

  // We use NgZone so Angular knows when to update the UI from the animation frame
  constructor(private ngZone: NgZone) {}

  async ngAfterViewInit() {
    await this.setupCamera();
    await this.loadModel();
    this.detectPose();
  }

  async toggleCamera() {
    const video = this.videoElement.nativeElement;

    if (this.isCameraActive) {
      // TURN OFF: Grab the camera stream and stop all hardware tracks
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }
      this.isCameraActive = false;
    } else {
      // TURN ON: Re-run setup
      await this.setupCamera();
    }
  }

  // 1. Turn on the Webcam
  async setupCamera() {
    const video = this.videoElement.nativeElement;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // UPDATE THIS LINE: Ask for the front camera specifically
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });

      video.srcObject = stream;
      this.isCameraActive = true;

      return new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
      });
    } else {
      alert('Camera not supported in this browser!');
    }
  }

  // 2. Load the AI Model (MoveNet)
  async loadModel() {
    try {
      console.log('Starting TFJS...');
      await tf.ready();
      console.log('TFJS ready. Downloading MoveNet model...');

      const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
      this.detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );

      console.log('Model loaded successfully!');
      this.isLoading = false;
    } catch (error) {
      console.error('FATAL ERROR loading model:', error);
      alert('Failed to load the AI model. Check the developer console.');
    }
  }

  // 3. The Continuous Detection Loop
  async detectPose() {
    if (!this.detector) return;
    const video = this.videoElement.nativeElement;

    // Only try to detect poses if the camera is active AND the video has loaded data
    if (this.isCameraActive && video.readyState >= 2) {
      const poses = await this.detector.estimatePoses(video);
      if (poses.length > 0) {
        this.processJumpLogic(poses[0]);
      }
    }

    // Keep the loop running in the background even if paused
    requestAnimationFrame(() => this.detectPose());
  }

  // 4. The Jump Counting Algorithm
  processJumpLogic(pose: poseDetection.Pose) {
    // Find the left and right hips
    const leftHip = pose.keypoints.find((k) => k.name === 'left_hip');
    const rightHip = pose.keypoints.find((k) => k.name === 'right_hip');

    if (leftHip && rightHip && leftHip.score! > 0.5 && rightHip.score! > 0.5) {
      // Calculate the average Y position of both hips
      const currentHipY = (leftHip.y + rightHip.y) / 2;

      // Set baseline if it's the first time we see the person
      if (this.initialHipY === null) {
        this.initialHipY = currentHipY;
      }

      // Check if they moved UP past the threshold (Y axis goes down in web browsers, so moving UP means smaller Y)
      if (currentHipY < this.initialHipY - this.JUMP_THRESHOLD && !this.isJumping) {
        this.isJumping = true; // They are in the air
      }

      // Check if they landed back near the baseline
      if (currentHipY > this.initialHipY - 10 && this.isJumping) {
        this.isJumping = false; // They landed

        // Update the count inside NgZone so Angular knows to update the HTML immediately
        this.ngZone.run(() => {
          this.jumpCount++;
        });
      }

      // Gradually adjust the baseline in case the user moves closer/further from the camera
      this.initialHipY = this.initialHipY * 0.95 + currentHipY * 0.05;
    }
  }

  resetCounter() {
    this.jumpCount = 0;
    this.isJumping = false;
    this.initialHipY = null;
  }
}
