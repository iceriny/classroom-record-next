import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import SectionCard from "../components/SectionCard";
import { deleteMediaAsset } from "../lib/mediaStorage";
import { useAppStore } from "../store/useAppStore";
import { sessionLabelNow } from "../utils/session";

export default function CollectPage() {
  const navigate = useNavigate();
  const classes = useAppStore((state) => state.classes);
  const sessions = useAppStore((state) => state.sessions);
  const media = useAppStore((state) => state.media);
  const createSession = useAppStore((state) => state.createSession);
  const deleteSession = useAppStore((state) => state.deleteSession);

  const [sessionLabels, setSessionLabels] = useState<Record<string, string>>(
    {},
  );

  const classList = useMemo(
    () =>
      Object.values(classes).sort((left, right) =>
        left.name.localeCompare(right.name, "zh-Hans-CN"),
      ),
    [classes],
  );

  const sessionsByClass = useMemo(() => {
    const map: Record<
      string,
      { id: string; label: string; createdAt: number }[]
    > = {};
    for (const session of Object.values(sessions)) {
      (map[session.classId] ??= []).push(session);
    }
    for (const list of Object.values(map)) {
      list.sort((left, right) => right.createdAt - left.createdAt);
    }
    return map;
  }, [sessions]);

  async function handleDeleteSession(sessionId: string) {
    const targetMedia = Object.values(media).filter(
      (item) => item.sessionId === sessionId,
    );
    await Promise.all(targetMedia.map((item) => deleteMediaAsset(item.id)));
    deleteSession(sessionId);
  }

  return (
    <div className="page-grid">
      <SectionCard
        title="采集首页"
        description="按班级管理采集箱，并进入学生列表开始拍照或录像。"
      >
        {classList.length === 0 ? (
          <div className="empty-panel">
            <h3>还没有班级</h3>
            <p className="muted">请先前往管理页创建班级与学生。</p>
            <Link to="/manage" className="primary-btn inline-btn">
              去管理
            </Link>
          </div>
        ) : (
          <div className="card-list">
            {classList.map((classRoom) => {
              const sessionList = sessionsByClass[classRoom.id] ?? [];
              const value = sessionLabels[classRoom.id] ?? sessionLabelNow();
              return (
                <article className="panel nested-card" key={classRoom.id}>
                  <div className="section-head compact-head">
                    <div>
                      <h3>{classRoom.name}</h3>
                      <p className="muted">
                        学生 {classRoom.studentIds.length} 人 · 采集箱{" "}
                        {sessionList.length} 个
                      </p>
                    </div>
                    <div className="stack-row wrap-row">
                      <input
                        value={value}
                        onChange={(event) =>
                          setSessionLabels((current) => ({
                            ...current,
                            [classRoom.id]: event.target.value,
                          }))
                        }
                        placeholder="采集箱名称"
                      />
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={() => {
                          if (!classRoom.studentIds.length) {
                            navigate("/manage");
                            return;
                          }
                          const sessionId = createSession(
                            classRoom.id,
                            value || sessionLabelNow(),
                          );
                          setSessionLabels((current) => ({
                            ...current,
                            [classRoom.id]: sessionLabelNow(),
                          }));
                          navigate(`/collect/session/${sessionId}`);
                        }}
                      >
                        新建采集
                      </button>
                    </div>
                  </div>

                  <div className="session-list">
                    {sessionList.length === 0 ? (
                      <p className="muted">暂无采集箱。</p>
                    ) : null}
                    {sessionList.map((session) => {
                      const completedCount = Object.values(media).filter(
                        (item) => item.sessionId === session.id,
                      ).length;
                      return (
                        <div className="session-row" key={session.id}>
                          <button
                            type="button"
                            className="session-link"
                            onClick={() =>
                              navigate(`/collect/session/${session.id}`)
                            }
                          >
                            <strong>{session.label}</strong>
                            <span className="muted">
                              {dayjs(session.createdAt).format("MM-DD HH:mm")} ·
                              媒体 {completedCount} 条
                            </span>
                          </button>
                          <button
                            type="button"
                            className="danger-btn subtle-danger"
                            onClick={() => void handleDeleteSession(session.id)}
                          >
                            删除
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
