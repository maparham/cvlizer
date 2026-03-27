"""Shared Selenium testing stubs for URL parsing unit tests."""


class DummyWait:
    """Simple wait stub that always succeeds."""

    def __init__(self, *_args, **_kwargs):
        pass

    @staticmethod
    def until(*_args, **_kwargs):
        return True


class DummySwitchTo:
    """Minimal switch_to stub for iframe tests."""

    def frame(self, _iframe):
        return None

    def default_content(self):
        return None


class DummyIframeDriver:
    """Driver stub for iframe content extraction tests."""

    def __init__(self):
        self.switch_to = DummySwitchTo()
        self._content = [
            "x" * 120,
            "short",
            "y" * 130,
        ]

    def find_elements(self, *_args, **_kwargs):
        return [object(), object(), object()]

    def execute_script(self, *_args, **_kwargs):
        return self._content.pop(0)


class DummyBrowserDriver:
    """Driver stub for browser extraction tests."""

    page_source = """
    <html><head>
      <script type="application/ld+json">
      {"@type":"JobPosting","title":"T","description":"short"}
      </script>
    </head><body>Body</body></html>
    """

    @staticmethod
    def set_page_load_timeout(*_args, **_kwargs):
        return None

    @staticmethod
    def get(*_args, **_kwargs):
        return None

    @staticmethod
    def execute_script(*_args, **_kwargs):
        return "Parent content " * 20

    @staticmethod
    def quit():
        return None
