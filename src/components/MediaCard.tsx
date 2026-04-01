import dayjs from "dayjs";

import { useMediaObjectUrl } from "../hooks/useMediaObjectUrl";
import type { MediaItem } from "../store/types";

type MediaCardProps = {
  item: MediaItem;
  title?: string;
  subtitle?: string;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  action?: React.ReactNode;
};

export default function MediaCard(props: MediaCardProps) {
  const mediaUrl = useMediaObjectUrl(props.item.id);

  return (
    <article
      className={props.selected ? "media-card is-selected" : "media-card"}
    >
      <button
        type="button"
        className={
          props.selectable ? "media-surface selectable" : "media-surface"
        }
        onClick={props.selectable ? props.onToggle : undefined}
      >
        {mediaUrl ? (
          props.item.type === "photo" ? (
            <img
              src={mediaUrl}
              alt={props.title ?? "照片预览"}
              className="media-preview"
            />
          ) : (
            <video
              src={mediaUrl}
              className="media-preview"
              controls
              preload="metadata"
            />
          )
        ) : (
          <div className="media-preview placeholder">正在载入媒体</div>
        )}
      </button>
      <div className="media-meta">
        <div>
          <strong>
            {props.title ?? (props.item.type === "photo" ? "照片" : "视频")}
          </strong>
          <p className="muted">
            {props.subtitle ??
              dayjs(props.item.createdAt).format("YYYY-MM-DD HH:mm:ss")}
          </p>
        </div>
        {props.action}
      </div>
    </article>
  );
}
