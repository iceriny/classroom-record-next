import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { saveCapturedMediaAsset } from "../lib/mediaStorage";
import { useAppStore } from "../store/useAppStore";
import { createId } from "../utils/id";
import { formatDuration } from "../utils/session";

function getVideoMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  return (
    candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ??
    ""
  );
}

export default function CameraCapturePage() {
  const navigate = useNavigate();
  const { sessionId = "", studentId = "" } = useParams();

  const session = useAppStore((state) => state.sessions[sessionId]);
  const classRoom = useAppStore((state) =>
    session ? state.classes[session.classId] : undefined,
  );
  const student = useAppStore((state) => state.students[studentId]);
  const media = useAppStore((state) => state.media);
  const addMediaItem = useAppStore((state) => state.addMediaItem);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaCount = useMemo(() => {
    return Object.values(media).filter(
      (item) => item.sessionId === sessionId && item.studentId === studentId,
    ).length;
  }, [media, sessionId, studentId]);

  const currentIndex = useMemo(() => {
    if (!classRoom) return -1;
    return classRoom.studentIds.findIndex((id) => id === studentId);
  }, [classRoom, studentId]);

  useEffect(() => {
    if (!session || !classRoom || !student) return;

    let disposed = false;

    async function startPreview() {
      try {
        setError("");
        const previewStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (disposed) {
          previewStream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = previewStream;
        if (videoRef.current) {
          videoRef.current.srcObject = previewStream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "无法访问相机，请检查浏览器权限。",
        );
      }
    }

    void startPreview();

    return () => {
      disposed = true;
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioStreamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      audioStreamRef.current = null;
    };
  }, [classRoom, session, student]);

  useEffect(() => {
    if (!isRecording) return undefined;

    const timer = window.setInterval(() => {
      setRecordingSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  async function capturePhoto() {
    if (
      !session ||
      !classRoom ||
      !student ||
      !videoRef.current ||
      isBusy ||
      isRecording
    )
      return;

    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
      setError("相机画面尚未准备好，请稍后重试。");
      return;
    }

    setIsBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("浏览器不支持 canvas 绘制。");
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png");
      });
      if (!blob) {
        throw new Error("无法生成照片文件。");
      }

      const mediaId = createId("media");
      const saved = await saveCapturedMediaAsset({
        mediaId,
        blob,
        type: "photo",
        classRoom,
        session,
        student,
      });

      addMediaItem({
        id: mediaId,
        classId: classRoom.id,
        sessionId: session.id,
        studentId: student.id,
        type: "photo",
        uri: saved.uri,
        createdAt: saved.createdAt,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "拍照失败。");
    } finally {
      setIsBusy(false);
    }
  }

  async function finalizeRecording(mimeType: string) {
    if (!session || !classRoom || !student) return;

    const chunks = chunksRef.current;
    chunksRef.current = [];
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;
    setIsRecording(false);
    setRecordingSeconds(0);

    if (!chunks.length) return;

    setIsBusy(true);
    try {
      const blob = new Blob(chunks, { type: mimeType || "video/webm" });
      const mediaId = createId("media");
      const saved = await saveCapturedMediaAsset({
        mediaId,
        blob,
        type: "video",
        classRoom,
        session,
        student,
      });

      addMediaItem({
        id: mediaId,
        classId: classRoom.id,
        sessionId: session.id,
        studentId: student.id,
        type: "video",
        uri: saved.uri,
        createdAt: saved.createdAt,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "录像保存失败。");
    } finally {
      setIsBusy(false);
    }
  }

  async function startRecording() {
    if (
      !streamRef.current ||
      !session ||
      !classRoom ||
      !student ||
      isBusy ||
      isRecording
    )
      return;
    if (typeof MediaRecorder === "undefined") {
      setError("当前浏览器不支持 MediaRecorder，只能拍照。");
      return;
    }

    setIsBusy(true);
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      audioStreamRef.current = audioStream;

      const combinedStream = new MediaStream([
        ...streamRef.current.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);

      const mimeType = getVideoMimeType();
      const recorder = mimeType
        ? new MediaRecorder(combinedStream, { mimeType })
        : new MediaRecorder(combinedStream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onerror = () => {
        setError("录像过程中发生错误。");
      };
      recorder.onstop = () => {
        void finalizeRecording(recorder.mimeType || mimeType);
      };

      recorder.start();
      setRecordingSeconds(0);
      setIsRecording(true);
      setError("");
    } catch (cause) {
      audioStreamRef.current?.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
      setError(
        cause instanceof Error
          ? cause.message
          : "无法启动录像，请检查麦克风权限。",
      );
    } finally {
      setIsBusy(false);
    }
  }

  function stopRecording() {
    if (!recorderRef.current || recorderRef.current.state === "inactive")
      return;
    recorderRef.current.stop();
  }

  function goToStudent(delta: number) {
    if (
      !classRoom ||
      classRoom.studentIds.length <= 1 ||
      isRecording ||
      isBusy ||
      currentIndex < 0
    )
      return;
    const nextIndex =
      (currentIndex + delta + classRoom.studentIds.length) %
      classRoom.studentIds.length;
    const nextStudentId = classRoom.studentIds[nextIndex];
    navigate(`/collect/camera/${sessionId}/${nextStudentId}`, {
      replace: true,
    });
  }

  if (!session || !classRoom || !student) {
    return (
      <div className="page-grid narrow-grid">
        <div className="panel hero-card">
          <h2>无法进入相机</h2>
          <p className="muted">采集箱或学生信息不存在。</p>
          <Link to="/collect" className="primary-btn inline-btn">
            返回采集页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="camera-page">
      <div className="camera-stage panel">
        <video
          ref={videoRef}
          className="camera-video"
          autoPlay
          muted
          playsInline
        />
        <div className="camera-overlay top-left">
          <strong>{student.name}</strong>
          <span>
            {classRoom.name} · {session.label}
          </span>
        </div>
        <div className="camera-overlay top-right">
          <span className="status-pill">媒体 {mediaCount}</span>
          {isRecording ? (
            <span className="record-pill">
              录制中 {formatDuration(recordingSeconds)}
            </span>
          ) : null}
        </div>
        {error ? <div className="camera-message">{error}</div> : null}
      </div>

      <div className="camera-actions panel">
        <div className="stack-row wrap-row camera-tool-row">
          <button
            type="button"
            className="ghost-btn"
            onClick={() => goToStudent(-1)}
          >
            上一位
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => goToStudent(1)}
          >
            下一位
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => navigate(`/preview/${session.id}/${student.id}`)}
          >
            预览媒体
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => navigate(`/collect/session/${session.id}`)}
          >
            返回名单
          </button>
        </div>
        <div className="camera-cta-row">
          <button
            type="button"
            className="capture-btn photo-btn"
            onClick={() => void capturePhoto()}
            disabled={isBusy || isRecording}
          >
            拍照
          </button>
          {isRecording ? (
            <button
              type="button"
              className="capture-btn record-btn stop-btn"
              onClick={stopRecording}
              disabled={isBusy}
            >
              停止录像
            </button>
          ) : (
            <button
              type="button"
              className="capture-btn record-btn"
              onClick={() => void startRecording()}
              disabled={isBusy}
            >
              开始录像
            </button>
          )}
        </div>
        <p className="muted camera-tip">
          照片为标准 PNG。要进系统相册或发到电脑，请在预览页点“保存到设备”。
        </p>
      </div>
    </div>
  );
}
