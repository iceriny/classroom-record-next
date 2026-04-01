import { useEffect, useMemo, useState } from "react";

import SectionCard from "../components/SectionCard";
import {
  chooseRootDirectory,
  getConfiguredRootDirectory,
  isFileSystemAccessSupported,
  removeConfiguredRootDirectory,
} from "../lib/mediaStorage";
import { deleteMediaAsset } from "../lib/mediaStorage";
import { useAppStore } from "../store/useAppStore";
import { splitStudentNames } from "../utils/session";

export default function ManagePage() {
  const classes = useAppStore((state) => state.classes);
  const students = useAppStore((state) => state.students);
  const media = useAppStore((state) => state.media);
  const addClass = useAppStore((state) => state.addClass);
  const addStudentsToClass = useAppStore((state) => state.addStudentsToClass);
  const deleteClass = useAppStore((state) => state.deleteClass);
  const renameStudent = useAppStore((state) => state.renameStudent);
  const moveStudentToClass = useAppStore((state) => state.moveStudentToClass);
  const deleteStudent = useAppStore((state) => state.deleteStudent);

  const [className, setClassName] = useState("");
  const [studentText, setStudentText] = useState("");
  const [addingToClassId, setAddingToClassId] = useState<string | null>(null);
  const [addingStudentsText, setAddingStudentsText] = useState("");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [movingStudentId, setMovingStudentId] = useState<string | null>(null);
  const [moveTargetClassId, setMoveTargetClassId] = useState("");
  const [rootDirectoryName, setRootDirectoryName] = useState<string>("未配置");

  const classList = useMemo(
    () =>
      Object.values(classes).sort((left, right) =>
        left.name.localeCompare(right.name, "zh-Hans-CN"),
      ),
    [classes],
  );

  useEffect(() => {
    void (async () => {
      const handle = await getConfiguredRootDirectory();
      setRootDirectoryName(handle?.name ?? "仅 IndexedDB");
    })();
  }, []);

  function resetStudentActions() {
    setEditingStudentId(null);
    setEditStudentName("");
    setMovingStudentId(null);
    setMoveTargetClassId("");
  }

  function handleCreateClass() {
    const name = className.trim();
    if (!name) return;

    const classId = addClass(name);
    const names = splitStudentNames(studentText);
    if (names.length && classId) {
      addStudentsToClass(classId, names);
    }

    setClassName("");
    setStudentText("");
  }

  async function handleDeleteClass(classId: string) {
    const targetMedia = Object.values(media).filter(
      (item) => item.classId === classId,
    );
    await Promise.all(targetMedia.map((item) => deleteMediaAsset(item.id)));
    deleteClass(classId);
  }

  async function handleDeleteStudent(studentId: string) {
    deleteStudent(studentId);
    resetStudentActions();
  }

  async function configureDirectory() {
    const handle = await chooseRootDirectory();
    setRootDirectoryName(handle?.name ?? "仅 IndexedDB");
  }

  async function clearDirectory() {
    await removeConfiguredRootDirectory();
    setRootDirectoryName("仅 IndexedDB");
  }

  return (
    <div className="page-grid">
      <SectionCard
        title="存储策略"
        description="媒体总会写入 IndexedDB；如果浏览器支持，也可以额外镜像写入你选择的目录。手机系统相册通常不会直接读取浏览器沙盒目录，需要在预览页另存到设备。"
        action={
          <span className="status-pill">
            {isFileSystemAccessSupported()
              ? "支持目录访问"
              : "浏览器不支持目录访问"}
          </span>
        }
      >
        <div className="stack-row wrap-row">
          <div>
            <strong>当前保存目录</strong>
            <p className="muted">{rootDirectoryName}</p>
          </div>
          <div className="stack-row">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => void configureDirectory()}
            >
              选择目录
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => void clearDirectory()}
            >
              仅用 IndexedDB
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="新建班级"
        description="支持创建班级时直接导入学生名单。"
      >
        <div className="form-grid two-col">
          <label className="field">
            <span>班级名称</span>
            <input
              value={className}
              onChange={(event) => setClassName(event.target.value)}
              placeholder="例如：一年级二班"
            />
          </label>
          <label className="field field-block">
            <span>学生名单</span>
            <textarea
              value={studentText}
              onChange={(event) => setStudentText(event.target.value)}
              placeholder={"一行一个，或用逗号分隔\n张三\n李四\n王五"}
              rows={5}
            />
          </label>
        </div>
        <div className="stack-row end-row">
          <button
            type="button"
            className="primary-btn"
            onClick={handleCreateClass}
          >
            创建班级
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="班级与学生"
        description="删除学生只会把学生移出班级，不清理历史媒体索引。"
      >
        {classList.length === 0 ? (
          <p className="empty-copy">暂无班级，请先创建班级与学生名单。</p>
        ) : null}
        <div className="card-list">
          {classList.map((classRoom) => (
            <article className="panel nested-card" key={classRoom.id}>
              <div className="section-head compact-head">
                <div>
                  <h3>{classRoom.name}</h3>
                  <p className="muted">学生 {classRoom.studentIds.length} 人</p>
                </div>
                <div className="stack-row">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      setAddingToClassId(
                        addingToClassId === classRoom.id ? null : classRoom.id,
                      );
                      setAddingStudentsText("");
                    }}
                  >
                    添加学生
                  </button>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => void handleDeleteClass(classRoom.id)}
                  >
                    删除班级
                  </button>
                </div>
              </div>

              {addingToClassId === classRoom.id ? (
                <div className="subpanel">
                  <label className="field field-block">
                    <span>新增学生</span>
                    <textarea
                      value={addingStudentsText}
                      onChange={(event) =>
                        setAddingStudentsText(event.target.value)
                      }
                      placeholder={"一行一个，或用逗号分隔\n张三\n李四\n王五"}
                      rows={4}
                    />
                  </label>
                  <div className="stack-row end-row">
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => {
                        const names = splitStudentNames(addingStudentsText);
                        if (!names.length) return;
                        addStudentsToClass(classRoom.id, names);
                        setAddingStudentsText("");
                        setAddingToClassId(null);
                      }}
                    >
                      确认添加
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="student-list">
                {classRoom.studentIds.length === 0 ? (
                  <p className="muted">暂无学生。</p>
                ) : null}
                {classRoom.studentIds.map((studentId) => {
                  const student = students[studentId];
                  if (!student) return null;

                  const otherClasses = classList.filter(
                    (item) => item.id !== classRoom.id,
                  );
                  return (
                    <div className="student-row" key={student.id}>
                      <div>
                        <strong>{student.name}</strong>
                        <p className="muted">历史媒体会保留在索引中。</p>
                      </div>
                      <div className="stack-row wrap-row">
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => {
                            setEditingStudentId(student.id);
                            setEditStudentName(student.name);
                            setMovingStudentId(null);
                          }}
                        >
                          改名
                        </button>
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => {
                            setMovingStudentId(student.id);
                            setMoveTargetClassId("");
                            setEditingStudentId(null);
                          }}
                          disabled={!otherClasses.length}
                        >
                          调班
                        </button>
                        <button
                          type="button"
                          className="danger-btn subtle-danger"
                          onClick={() => void handleDeleteStudent(student.id)}
                        >
                          删除
                        </button>
                      </div>

                      {editingStudentId === student.id ? (
                        <div className="inline-form">
                          <input
                            value={editStudentName}
                            onChange={(event) =>
                              setEditStudentName(event.target.value)
                            }
                          />
                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() => {
                              renameStudent(student.id, editStudentName);
                              resetStudentActions();
                            }}
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={resetStudentActions}
                          >
                            取消
                          </button>
                        </div>
                      ) : null}

                      {movingStudentId === student.id ? (
                        <div className="inline-form wrap-row">
                          <select
                            value={moveTargetClassId}
                            onChange={(event) =>
                              setMoveTargetClassId(event.target.value)
                            }
                          >
                            <option value="">选择目标班级</option>
                            {otherClasses.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() => {
                              if (!moveTargetClassId) return;
                              moveStudentToClass(student.id, moveTargetClassId);
                              resetStudentActions();
                            }}
                          >
                            确认调班
                          </button>
                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={resetStudentActions}
                          >
                            取消
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
