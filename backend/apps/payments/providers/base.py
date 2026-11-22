from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class WebhookResult:
    event_id: str
    event_type: str
    provider_session_id: str
    reference_number: str | None = None
    paid_at: datetime | None = None


@dataclass(frozen=True)
class SignedWebhook:
    raw_body: bytes
    headers: dict[str, str]


class PaymentProvider(ABC):
    name: str

    @abstractmethod
    def create_session(self, input_data: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def get_session(self, provider_session_id: str) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def verify_webhook(self, raw_body: bytes, headers: dict[str, str]) -> WebhookResult:
        raise NotImplementedError
