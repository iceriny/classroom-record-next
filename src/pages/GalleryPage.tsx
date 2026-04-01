import dayjs from "dayjs";
import JSZip from "jszip";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import MediaCard from "../components/MediaCard";
import SectionCard from "../components/SectionCard";
import {
  deleteMediaAsset,
  getFilenameFromUri,
  getMediaBlob,
  sanitizePathPart,
} from "../lib/mediaStorage";
import type { ID, MediaItem } from "../store/types";
import { useAppStore } from "../store/useAppStore";

type GalleryRow = MediaItem & {
  className: string;
  studentName: string;
  sessionLabel: string;
  dateKey: string;
};

type GallerySection = {
  dateKey: string;
  classes: {
    classId: ID;
    className: string;
    items: GalleryRow[];
  }[];
};

async function shareOrDownloadZip(blob: Blob, fileName: string) {
  const file = new File([blob], fileName, { type: "application/zip" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "课堂采集导出" });
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function GalleryPage() {
  const navigate = useNavigate();
  const classes = useAppStore((state) => state.classes);
  const students = useAppStore((state) => state.students);
  const sessions = useAppStore((state) => state.sessions);
  const media = useAppStore((state) => state.media);
  const removeMediaItem = useAppStore((state) => state.removeMediaItem);

  const [multi, setMulti] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const rows = useMemo(() => {
    const list: GalleryRow[] = [];
    for (const item of Object.values(media)) {
      const classRoom = classes[item.classId];
      const session = sessions[item.sessionId];
      if (!classRoom || !session) continue;
      list.push({
        ...item,
        className: classRoom.name,
        studentName: students[item.studentId]?.name ?? "已删除学生",
        sessionLabel: session.label,
        dateKey: dayjs(item.createdAt).format("YYYY-MM-DD"),
      });
    }
    return list.sort((left, right) => right.createdAt - left.createdAt);
  }, [classes, media, sessions, students]);

  const sections = useMemo<GallerySection[]>(() => {
    const byDate = new Map<string, Map<string, GalleryRow[]>>();
    for (const row of rows) {
      const byClass =
        byDate.get(row.dateKey) ?? new Map<string, GalleryRow[]>();
      const list = byClass.get(row.classId) ?? [];
      list.push(row);
      byClass.set(row.classId, list);
      byDate.set(row.dateKey, byClass);
    }

    return Array.from(byDate.entries())
      .sort((left, right) => (left[0] < right[0] ? 1 : -1))
      .map(([dateKey, byClass]) => ({
        dateKey,
        classes: Array.from(byClass.entries())
          .map(([classId, items]) => ({
            classId,
            className: items[0].className,
            items,
          }))
          .sort((left, right) =>
            left.className.localeCompare(right.className, "zh-Hans-CN"),
          ),
      }));
  }, [rows]);

  function getSelectionState(ids: ID[]) {
    if (!ids.length) return "none" as const;
    const checked = ids.filter((id) => selected[id]).length;
    if (checked === 0) return "none" as const;
    if (checked === ids.length) return "all" as const;
    return "some" as const;
  }

  function toggleGroup(ids: ID[]) {
    const nextValue = getSelectionState(ids) !== "all";
    setSelected((current) => {
      const next = { ...current };
      for (const id of ids) {
        if (nextValue) next[id] = true;
        else delete next[id];
      }
      return next;
    });
    setMulti(true);
  }

  async function deleteSelected() {
    const ids = Object.keys(selected).filter((id) => selected[id]);
    await Promise.all(
      ids.map(async (id) => {
        await deleteMediaAsset(id);
        removeMediaItem(id);
      }),
    );
    setSelected({});
    setMulti(false);
  }

  async function exportSelected() {
    const ids = Object.keys(selected).filter((id) => selected[id]);
    if (!ids.length) return;

    const zip = new JSZip();
    for (const row of rows.filter((item) => ids.includes(item.id))) {
      const blob = await getMediaBlob(row.id);
      if (!blob) continue;
      const path = [
        sanitizePathPart(row.className),
        sanitizePathPart(row.dateKey),
        sanitizePathPart(getFilenameFromUri(row.uri)),
      ].join("/");
      zip.file(path, blob);
    }

    const archive = await zip.generateAsync({ type: "blob" });
    const fileName = `ClassRecord_${dayjs().format("YYYYMMDD_HHmmss")}.zip`;
    await shareOrDownloadZip(archive, fileName);
  }

  return (
    <div className="page-grid">
      <SectionCard
        title="画廊"
        description="按日期和班级聚合展示媒体，可多选删除或导出 ZIP。"
        action={
          <div className="stack-row wrap-row">
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                setMulti((current) => !current);
                setSelected({});
              }}
            >
              {multi ? "退出多选" : "多选"}
            </button>
            {multi ? (
              <>
                <button
                  type="button"
                  className="danger-btn"
                  onClick={() => void deleteSelected()}
                >
                  删除所选
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => void exportSelected()}
                >
                  导出 ZIP
                </button>
              </>
            ) : null}
          </div>
        }
      >
        {sections.length === 0 ? (
          <p className="empty-copy">
            暂无媒体。去采集页拍照或录像后，这里会自动聚合展示。
          </p>
        ) : null}
        <div className="gallery-sections">
          {sections.map((section) => {
            const dateIds = section.classes.flatMap((group) =>
              group.items.map((item) => item.id),
            );
            const dateState = getSelectionState(dateIds);
            return (
              <section className="gallery-section" key={section.dateKey}>
                <div className="section-head compact-head sticky-lite">
                  <div>
                    <h3>{section.dateKey}</h3>
                    <p className="muted">{dateIds.length} 条媒体</p>
                  </div>
                  {multi ? (
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => toggleGroup(dateIds)}
                    >
                      {dateState === "all" ? "取消当日" : "全选当日"}
                    </button>
                  ) : null}
                </div>

                {section.classes.map((group) => {
                  const classIds = group.items.map((item) => item.id);
                  const classState = getSelectionState(classIds);
                  return (
                    <div
                      className="panel nested-card"
                      key={`${section.dateKey}-${group.classId}`}
                    >
                      <div className="section-head compact-head">
                        <div>
                          <h4>{group.className}</h4>
                          <p className="muted">{group.items.length} 条</p>
                        </div>
                        {multi ? (
                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={() => toggleGroup(classIds)}
                          >
                            {classState === "all" ? "取消本班" : "全选本班"}
                          </button>
                        ) : null}
                      </div>
                      <div className="media-grid">
                        {group.items.map((item) => (
                          <MediaCard
                            key={item.id}
                            item={item}
                            title={`${multi ? (selected[item.id] ? "✓ " : "○ ") : ""}${item.studentName}`}
                            subtitle={`${item.type === "photo" ? "照片" : "视频"} · ${item.sessionLabel} · ${dayjs(item.createdAt).format("HH:mm:ss")}`}
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
                                  className="secondary-btn"
                                  onClick={() =>
                                    navigate(
                                      `/preview/${item.sessionId}/${item.studentId}`,
                                    )
                                  }
                                >
                                  打开
                                </button>
                              )
                            }
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
