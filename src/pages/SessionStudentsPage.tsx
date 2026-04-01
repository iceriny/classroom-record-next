import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import SectionCard from "../components/SectionCard";
import { useAppStore } from "../store/useAppStore";

export default function SessionStudentsPage() {
  const navigate = useNavigate();
  const { sessionId = "" } = useParams();

  const session = useAppStore((state) => state.sessions[sessionId]);
  const classRoom = useAppStore((state) =>
    session ? state.classes[session.classId] : undefined,
  );
  const students = useAppStore((state) => state.students);
  const media = useAppStore((state) => state.media);

  const list = useMemo(() => {
    if (!classRoom) return [];
    return classRoom.studentIds
      .map((id) => students[id])
      .filter(Boolean)
      .map((student) => {
        const mediaCount = Object.values(media).filter(
          (item) =>
            item.sessionId === sessionId && item.studentId === student.id,
        ).length;
        return {
          id: student.id,
          name: student.name,
          mediaCount,
        };
      });
  }, [classRoom, media, sessionId, students]);

  if (!session || !classRoom) {
    return (
      <div className="page-grid">
        <SectionCard title="采集箱不存在" description="该采集箱可能已被删除。">
          <Link to="/collect" className="primary-btn inline-btn">
            返回采集首页
          </Link>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="page-grid narrow-grid">
      <SectionCard
        title={classRoom.name}
        description={`采集箱：${session.label}`}
        action={
          <button
            type="button"
            className="ghost-btn"
            onClick={() => navigate("/collect")}
          >
            返回采集
          </button>
        }
      >
        <div className="student-list large-list">
          {list.map((student) => (
            <div className="student-row student-tile" key={student.id}>
              <div>
                <strong>{student.name}</strong>
                <p className="muted">
                  {student.mediaCount
                    ? `已采集 ${student.mediaCount} 条`
                    : "未采集"}
                </p>
              </div>
              <div className="stack-row wrap-row">
                {student.mediaCount ? (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() =>
                      navigate(`/preview/${session.id}/${student.id}`)
                    }
                  >
                    预览
                  </button>
                ) : null}
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() =>
                    navigate(`/collect/camera/${session.id}/${student.id}`)
                  }
                >
                  开始采集
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
