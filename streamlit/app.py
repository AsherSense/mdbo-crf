"""Streamlit front end for the existing authenticated CRF backend."""
import json
import re
import uuid
from datetime import date
from pathlib import Path

import streamlit as st

from backend import BackendError, CRFClient, data_for_export, record_defaults, records_for_pane

SCHEMA = json.loads((Path(__file__).parent / "schema.json").read_text(encoding="utf-8"))
MODULES = {module["id"]: module for module in SCHEMA["modules"]}
CENTERS = SCHEMA["centers"]
STUDY = "MDBO · 研究记录与中央随机化"
st.set_page_config(page_title=STUDY, layout="wide")
st.title(STUDY)


def fail(message):
    st.error(message)
    st.stop()


try:
    settings = st.secrets["crf"]
    backend_url = settings["backend_url"]
    token = settings["service_token"]
    allowed = {email.strip().lower() for email in settings["allowed_emails"].split(",") if email.strip()}
    if not allowed:
        fail("未配置授权用户。")
    auth = st.secrets["auth"]
    if not all(auth.get(key) for key in ("redirect_uri", "cookie_secret", "client_id", "client_secret", "server_metadata_url")):
        fail("尚未配置登录服务。")
except (KeyError, FileNotFoundError, ValueError):
    fail("尚未配置安全的登录与云端存储，不能录入患者资料。")

if not st.user.is_logged_in:
    st.info("请使用研究团队账号登录。")
    if st.button("登录"):
        st.login()
    st.stop()

email = str(st.user.get("email", "")).strip().lower()
if not st.user.get("email_verified", False) or email not in allowed:
    st.error("该账号未获授权访问研究资料。")
    if st.button("退出登录"):
        st.logout()
    st.stop()
client = CRFClient(backend_url, token, email)

with st.sidebar:
    st.caption(email)
    if st.button("退出登录"):
        st.logout()

try:
    listing = client.patients()["patients"]
except BackendError as error:
    fail(str(error))

with st.expander("新建患者"):
    with st.form("create_patient", clear_on_submit=True):
        patient_id = st.text_input("住院号（全研究唯一）")
        center = st.selectbox("研究中心", list(CENTERS), format_func=lambda key: key + " · " + CENTERS[key])
        name = st.text_input("姓名")
        phone = st.text_input("联系电话")
        create = st.form_submit_button("建立患者档案")
    if create:
        if not re.fullmatch(r"[-A-Za-z0-9_]{1,64}", patient_id):
            st.error("住院号限 1–64 位字母、数字、连字符和下划线。")
        else:
            try:
                client.create(patient_id, center, name, phone)
                st.session_state["patient_id"] = patient_id
                st.rerun()
            except BackendError as error:
                st.error(str(error))

ids = [item["id"] for item in listing]
if not ids:
    st.info("暂无患者记录。")
    st.stop()
if st.session_state.get("patient_id") not in ids:
    st.session_state["patient_id"] = ids[0]
selected = st.selectbox("选择已有患者", ids, index=ids.index(st.session_state["patient_id"]), format_func=lambda key: key + " · " + next(item["center"] for item in listing if item["id"] == key))
st.session_state["patient_id"] = selected
try:
    bundle = client.patient(selected)
except BackendError as error:
    fail(str(error))

patient, allocation = bundle["patient"], bundle["allocation"]
st.caption("住院号 " + selected + " · " + CENTERS[patient["center"]] + " · 服务器云端存储")
if allocation:
    st.success("已随机分组 · " + allocation["randomNo"] + " · " + SCHEMA["groups"][allocation["arm"]])
else:
    st.info("尚未随机分组")

with st.expander("患者姓名和联系电话"):
    with st.form("profile"):
        new_name = st.text_input("姓名", value=patient.get("name") or "")
        new_phone = st.text_input("联系电话", value=patient.get("phone") or "")
        update_profile = st.form_submit_button("保存基本信息")
    if update_profile:
        try:
            client.profile(selected, new_name, new_phone)
            st.rerun()
        except BackendError as error:
            st.error(str(error))

workflow = SCHEMA["workflow"]
view = st.sidebar.radio("按访视时间填写", workflow, format_func=lambda item: item["title"])
panes = view["panes"]
pane = st.radio("本次访视内容", panes, format_func=lambda item: item["label"], horizontal=True)
module = MODULES[pane["module"]]
records = records_for_pane(bundle["records"], pane)
if module.get("repeat"):
    choices = [record["slot"] for record in records] + ["__new__"]
    chosen = st.selectbox("记录", choices, format_func=lambda key: "新增一条" if key == "__new__" else next((record["data"].get("date") or key for record in records if record["slot"] == key), key))
    record = next((record for record in records if record["slot"] == chosen), None)
    key = (selected, module["id"], pane.get("context"))
    if chosen == "__new__":
        if st.session_state.get("new_record_key") != key:
            st.session_state["new_record_key"] = key
            st.session_state["new_record_slot"] = str(uuid.uuid4())
        slot = st.session_state["new_record_slot"]
    else:
        slot = chosen
else:
    slot = "main"
    record = next((item for item in records if item["slot"] == slot), None)

values = {**record_defaults(pane), **(record["data"] if record else {})}
if module["id"] == "random" and allocation:
    st.warning("随机分组依据已锁定，不能修改或重新分组。")


def render_field(field, current, disabled):
    label, kind = field["label"], field["type"]
    hint = field.get("hint") or None
    if kind == "select":
        options = [""] + field["options"]
        return st.selectbox(label, options, index=options.index(current) if current in options else 0, help=hint, disabled=disabled)
    if kind == "date":
        try:
            initial = date.fromisoformat(current) if current else None
        except ValueError:
            initial = None
        value = st.date_input(label, value=initial, format="YYYY-MM-DD", help=hint, disabled=disabled)
        return value.isoformat() if isinstance(value, date) else ""
    if kind == "textarea":
        return st.text_area(label, value=current, help=hint, disabled=disabled)
    return st.text_input(label, value=current, help=hint, disabled=disabled)


with st.form("record_" + selected + "_" + module["id"] + "_" + slot):
    st.subheader(module["title"])
    if module.get("source"):
        st.caption(module["source"])
    data = dict(values)
    for field in module["fields"]:
        if module["id"] == "therapy" and pane.get("context") != "围术期" and field["id"] in ("nsaid", "nsaidOther", "pancreaticStent", "spec", "antibiotic", "antibioticDetail"):
            continue
        fixed_context = pane.get("context") and field["id"] == ("visit" if module["id"] == "therapy" else "time")
        data[field["id"]] = render_field(field, str(values.get(field["id"], "")), bool(field.get("generated") or fixed_context or module["id"] == "random" and allocation))
    save = st.form_submit_button("保存本页", disabled=bool(module["id"] == "random" and allocation))
if save:
    try:
        client.save(selected, module["id"], slot, data, record["version"] if record else 0)
        st.success("保存成功")
        st.rerun()
    except BackendError as error:
        st.error(str(error))

if module["id"] == "random" and not allocation:
    st.warning("随机化不可撤销。请核对入组资格、肿瘤分层和术中导丝确认。")
    confirm = st.checkbox("已核对并确认正式随机分组")
    if st.button("执行中央随机分组", disabled=not confirm):
        try:
            result = client.randomize(selected)
            st.success("随机号 " + result["allocation"]["randomNo"])
            st.rerun()
        except BackendError as error:
            st.error(str(error))

with st.expander("下载保存记录与审计"):
    if st.button("准备导出"):
        try:
            st.session_state["export_bytes"] = data_for_export(client.patient(selected), client.audit(selected))
        except BackendError as error:
            st.error(str(error))
    if st.session_state.get("export_bytes"):
        st.download_button("下载 JSON", st.session_state["export_bytes"], file_name="MDBO_" + selected + ".json", mime="application/json")
