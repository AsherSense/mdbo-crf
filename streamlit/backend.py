"""Server-side client for the existing CRF Worker API."""
import json
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen


class BackendError(Exception):
    pass


class CRFClient:
    def __init__(self, base_url, token, actor):
        url = urlsplit(base_url)
        if url.scheme != "https" or url.hostname != "mdbo-crf.ashersense-research.workers.dev" or url.path not in ("", "/"):
            raise ValueError("Backend URL must be the configured HTTPS CRF Worker")
        if not token:
            raise ValueError("Missing backend service token")
        if not actor or "@" not in actor:
            raise ValueError("Missing authenticated operator")
        self.base_url = f"https://{url.hostname}"
        self.token = token
        self.actor = actor

    def call(self, path, data=None):
        url = self.base_url + "/api/" + path
        headers = {"Authorization": "Bearer " + self.token, "X-CRF-Actor": self.actor}
        if data is not None:
            headers["Content-Type"] = "application/json"
            headers["Origin"] = self.base_url
        request = Request(url, data=json.dumps(data, ensure_ascii=False).encode("utf-8") if data is not None else None, headers=headers, method="POST" if data is not None else "GET")
        try:
            with urlopen(request, timeout=20) as response:
                return json.load(response)
        except HTTPError as error:
            try:
                message = json.load(error).get("error", "Request rejected")
            except (ValueError, OSError):
                message = "Request rejected"
            raise BackendError(message) from None
        except URLError as error:
            raise BackendError("云端连接失败，请保留当前输入后重试") from error

    def patients(self):
        return self.call("patients")

    def patient(self, patient_id):
        return self.call("patients/" + quote(patient_id, safe=""))

    def audit(self, patient_id):
        return self.call("patients/" + quote(patient_id, safe="") + "/audit")

    def create(self, patient_id, center, name="", phone=""):
        return self.call("patients", {"id": patient_id, "center": center, "name": name, "phone": phone})

    def save(self, patient_id, module, slot, data, version):
        return self.call("patients/" + quote(patient_id, safe="") + "/records", {"module": module, "slot": slot, "data": data, "version": version})

    def randomize(self, patient_id):
        return self.call("patients/" + quote(patient_id, safe="") + "/randomize", {})

    def profile(self, patient_id, name, phone):
        return self.call("patients/" + quote(patient_id, safe="") + "/profile", {"name": name, "phone": phone})


def records_for_pane(records, pane):
    module, context = pane["module"], pane.get("context")
    key = "visit" if module == "therapy" else "time"
    return [record for record in records if record["module"] == module and (not context or record["data"].get(key) == context)]


def record_defaults(pane):
    context = pane.get("context")
    return {("visit" if pane["module"] == "therapy" else "time"): context} if context else {}


def data_for_export(bundle, audit):
    return json.dumps({**bundle, "audit": audit}, ensure_ascii=False, indent=2).encode("utf-8")
