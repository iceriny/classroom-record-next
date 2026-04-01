import { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import CollectPage from "./pages/CollectPage";
import SessionStudentsPage from "./pages/SessionStudentsPage";
import CameraCapturePage from "./pages/CameraCapturePage";
import GalleryPage from "./pages/GalleryPage";
import ManagePage from "./pages/ManagePage";
import StudentPreviewPage from "./pages/StudentPreviewPage";
import { useAppStore } from "./store/useAppStore";

function LoadingScreen() {
  return (
    <div className="app-shell loading-shell">
      <div className="panel hero-card">
        <p className="eyebrow">Classroom Record</p>
        <h1>正在恢复本地数据</h1>
        <p className="muted">首次打开会初始化 IndexedDB 与 PWA 缓存。</p>
      </div>
    </div>
  );
}

function AppLayout() {
  const location = useLocation();
  const hiddenNav = location.pathname.startsWith("/collect/camera/");
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [updateRegistration, setUpdateRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installMessage, setInstallMessage] = useState<string | null>(null);

  const isStandalone = useMemo(() => {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
    );
  }, []);

  const isIos = useMemo(() => {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleUpdateAvailable = (
      event: WindowEventMap["pwa:update-available"],
    ) => {
      setUpdateRegistration(event.detail);
    };
    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setDeferredInstallPrompt(event);
      setInstallMessage(null);
    };
    const handleAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setInstallMessage("应用已安装，可从主屏或桌面直接打开。");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("pwa:update-available", handleUpdateAvailable);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("pwa:update-available", handleUpdateAvailable);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleApplyUpdate() {
    const waitingWorker = updateRegistration?.waiting;
    if (!waitingWorker) {
      window.location.reload();
      return;
    }

    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }

  async function handleInstall() {
    if (!deferredInstallPrompt) return;

    await deferredInstallPrompt.prompt();
    const result = await deferredInstallPrompt.userChoice;
    if (result.outcome === "dismissed") {
      setInstallMessage("已取消安装，可稍后再试。 ");
    }
    setDeferredInstallPrompt(null);
  }

  return (
    <div className="app-shell">
      <header className="top-frame">
        <div>
          <p className="eyebrow">PWA Classroom Workflow</p>
          <h1>课堂采集归档</h1>
        </div>
        {!hiddenNav ? (
          <nav className="tab-nav" aria-label="主导航">
            <NavLink
              to="/collect"
              className={({ isActive }) =>
                isActive ? "tab-link active" : "tab-link"
              }
            >
              采集
            </NavLink>
            <NavLink
              to="/gallery"
              className={({ isActive }) =>
                isActive ? "tab-link active" : "tab-link"
              }
            >
              画廊
            </NavLink>
            <NavLink
              to="/manage"
              className={({ isActive }) =>
                isActive ? "tab-link active" : "tab-link"
              }
            >
              管理
            </NavLink>
          </nav>
        ) : null}
      </header>

      {isOffline ? (
        <div className="offline-banner panel" role="status" aria-live="polite">
          当前处于离线状态。已缓存的页面与 IndexedDB
          媒体仍可访问，新的联网请求会等恢复网络后再可用。
        </div>
      ) : null}

      {updateRegistration ? (
        <div className="action-banner panel" role="status" aria-live="polite">
          <div>
            <strong>发现新版本</strong>
            <p className="muted banner-copy">
              已下载到后台。点击立即更新后会刷新到最新版本。
            </p>
          </div>
          <div className="stack-row wrap-row">
            <button
              type="button"
              className="primary-btn"
              onClick={() => void handleApplyUpdate()}
            >
              立即更新
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => setUpdateRegistration(null)}
            >
              稍后
            </button>
          </div>
        </div>
      ) : null}

      {!isStandalone && (deferredInstallPrompt || isIos || installMessage) ? (
        <div className="action-banner panel" role="status" aria-live="polite">
          <div>
            <strong>安装应用</strong>
            <p className="muted banner-copy">
              {deferredInstallPrompt
                ? "当前浏览器已满足安装条件，可直接安装到手机桌面。"
                : isIos
                  ? "iPhone 或 iPad 上不会弹出安装事件，请使用浏览器分享菜单并选择“添加到主屏幕”。"
                  : (installMessage ??
                    "如果没有出现安装按钮，请确认当前是 HTTPS 或 localhost，并使用受支持的浏览器。")}
            </p>
          </div>
          {deferredInstallPrompt ? (
            <button
              type="button"
              className="primary-btn"
              onClick={() => void handleInstall()}
            >
              安装到设备
            </button>
          ) : null}
        </div>
      ) : null}

      <main className={hiddenNav ? "content content-camera" : "content"}>
        <Routes>
          <Route path="/" element={<Navigate to="/collect" replace />} />
          <Route path="/collect" element={<CollectPage />} />
          <Route
            path="/collect/session/:sessionId"
            element={<SessionStudentsPage />}
          />
          <Route
            path="/collect/camera/:sessionId/:studentId"
            element={<CameraCapturePage />}
          />
          <Route
            path="/preview/:sessionId/:studentId"
            element={<StudentPreviewPage />}
          />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/manage" element={<ManagePage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const hydrated = useAppStore((state) => state.hydrated);
  const initialize = useAppStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (!hydrated) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
