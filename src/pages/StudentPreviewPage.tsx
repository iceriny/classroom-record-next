import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import MediaCard from "../components/MediaCard";
import SectionCard from "../components/SectionCard";
import { deleteMediaAsset } from "../lib/mediaStorage";
import { useAppStore } from "../store/useAppStore";

export default function StudentPreviewPage() {
  const navigate = useNavigate();
  const { sessionId = "", studentId = "" } = useParams();

  const session = useAppStore((state) => state.sessions[sessionId]);
  const classRoom = useAppStore((state) =>
    session ? state.classes[session.classId] : undefined,
  );
  const student = useAppStore((state) => state.students[studentId]);
  const mediaMap = useAppStore((state) => state.media);
  const removeMediaItem = useAppStore((state) => state.removeMediaItem);

  const media = useMemo(() => {
    return Object.values(mediaMap)
      .filter(
        (item) => item.sessionId === sessionId && item.studentId === studentId,
      )
      .sort((left, right) => right.createdAt - left.createdAt);
  }, [mediaMap, sessionId, studentId]);

  const [multi, setMulti] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  async function deleteOne(id: string) {
    await deleteMediaAsset(id);
    removeMediaItem(id);
  }

  async function deleteSelected() {
    const ids = Object.keys(selected).filter((key) => selected[key]);
    await Promise.all(ids.map((id) => deleteOne(id)));
    setSelected({});
    setMulti(false);
  }

  async function recaptureAll() {
    await Promise.all(media.map((item) => deleteOne(item.id)));
    navigate(`/collect/camera/${sessionId}/${studentId}`, { replace: true });
  }

  if (!session || !classRoom || !student) {
    return (
      <div className="page-grid narrow-grid">
        <SectionCard title="预览不存在" description="该采集记录可能已被删除。">
          <Link to="/collect" className="primary-btn inline-btn">
            返回采集页
          </Link>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="page-grid">
      <SectionCard
        title={student.name}
        description={`${classRoom.name} · ${session.label}`}
        action={
          <div className="stack-row wrap-row">
            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                navigate(`/collect/camera/${session.id}/${student.id}`)
              }
            >
              继续采集
            </button>
            <button
              type="button"
              className="danger-btn"
              onClick={() => void recaptureAll()}
            >
              重新采集
            </button>
          </div>
        }
      >
        <div className="stack-row wrap-row end-row section-tools">
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              setMulti((current) => !current);
              setSelected({});
            }}
          >
            {multi ? "退出多选" : "多选删除"}
          </button>
          {multi ? (
            <button
              type="button"
              className="danger-btn"
              onClick={() => void deleteSelected()}
            >
              删除所选
            </button>
          ) : null}
        </div>

        {media.length === 0 ? (
          <p className="empty-copy">该学生在当前采集箱下还没有媒体。</p>
        ) : null}
        <div className="media-grid">
          {media.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              title={item.type === "photo" ? "照片" : "视频"}
              subtitle={dayjs(item.createdAt).format("YYYY-MM-DD HH:mm:ss")}
              selectable={multi}
              selected={!!selected[item.id]}
              onToggle={() =>
                setSelected((current) => ({
                  ...current,
                  [item.id]: !current[item.id],
                }))
              }
              action={
                multi ? null : (
                  <button
                    type="button"
                    className="danger-btn subtle-danger"
                    onClick={() => void deleteOne(item.id)}
                  >
                    删除
                  </button>
                )
              }
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
