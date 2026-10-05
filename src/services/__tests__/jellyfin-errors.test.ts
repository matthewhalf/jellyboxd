import { setCurrentLanguage } from "../../i18n";
import { InvalidCredentialsError, JellyfinService, SessionExpiredError, type SavedServer } from "../jellyfin";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const fetchMock = jest.fn();
const saved: SavedServer = {
  id: "http://srv::u",
  serverUrl: "http://srv",
  token: "t",
  userId: "u",
  userName: "Ann",
};

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  setCurrentLanguage("en");
});

describe.each([
  [
    "en",
    {
      loginUnreachable: /Unable to reach the server at http:\/\/192\.168\.1\.10:8096\./,
      invalid: "Incorrect credentials (wrong user name or password).",
      serverError: "Jellyfin server error (500): boom",
      unreachable: 'Unable to reach the server "http://srv". Check that it is online and try again.',
      expired: 'The login of "Ann" on http://srv has expired. Sign in again to load the library.',
    },
  ],
  [
    "it",
    {
      loginUnreachable: /Impossibile raggiungere il server all'indirizzo http:\/\/192\.168\.1\.10:8096\./,
      invalid: "Credenziali non corrette (username o password errati).",
      serverError: "Errore dal server Jellyfin (500): boom",
      unreachable: 'Impossibile raggiungere il server "http://srv". Controlla che sia online e riprova.',
      expired: 'L\'accesso di "Ann" su http://srv è scaduto. Accedi di nuovo per caricare la libreria.',
    },
  ],
] as const)("service messages in %s", (language, expected) => {
  beforeEach(() => setCurrentLanguage(language));

  it("says the server is unreachable at login", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await expect(JellyfinService.login("192.168.1.10:8096", "a", "b")).rejects.toThrow(expected.loginUnreachable);
  });

  it("reports wrong credentials", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false, status: 401 });
    const error = await JellyfinService.login("http://srv", "a", "b").catch((e) => e);
    expect(error).toBeInstanceOf(InvalidCredentialsError);
    expect(error.message).toBe(expected.invalid);
  });

  it("reports a server error with its status and details", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Server Error",
      text: async () => "boom",
    });
    await expect(JellyfinService.login("http://srv", "a", "b")).rejects.toThrow(expected.serverError);
  });

  it("explains an unreachable saved server", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await expect(JellyfinService.switchToSavedServer(saved)).rejects.toThrow(expected.unreachable);
  });

  it("explains an expired saved login", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 });
    const error = await JellyfinService.switchToSavedServer(saved).catch((e) => e);
    expect(error).toBeInstanceOf(SessionExpiredError);
    expect(error.message).toBe(expected.expired);
  });
});
