"""Errors that services raise when a request breaks a rule.

main.py turns each one into an HTTP response, {"detail": message}, with the
status code below, so services never need to import FastAPI.
"""


class ServiceError(Exception):
    status_code: int = 400

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail  # shown to the user as-is


class NotFound(ServiceError):
    status_code = 404


class Unauthorized(ServiceError):
    status_code = 401


class NotAllowed(ServiceError):
    status_code = 403


class Conflict(ServiceError):
    status_code = 409


class Gone(ServiceError):
    status_code = 410


class InvalidInput(ServiceError):
    status_code = 422
