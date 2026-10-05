import { createDemoSession, isDemoCredentials, isDemoServerUrl } from "../auth";

describe("isDemoCredentials", () => {
  it("accepts the documented review credentials", () => {
    expect(isDemoCredentials("demo.jellyboxd", "reviewer", "1test2")).toBe(true);
  });

  it("ignores case, whitespace, scheme and trailing slash on server and username", () => {
    expect(isDemoCredentials(" Demo.Jellyboxd/ ", " Reviewer ", "1test2")).toBe(true);
    expect(isDemoCredentials("https://demo.jellyboxd", "reviewer", "1test2")).toBe(true);
  });

  it("rejects a wrong password", () => {
    expect(isDemoCredentials("demo.jellyboxd", "reviewer", "1test3")).toBe(false);
    expect(isDemoCredentials("demo.jellyboxd", "reviewer", "1TEST2")).toBe(false);
  });

  it("rejects a real server even with the demo username and password", () => {
    expect(isDemoCredentials("192.168.1.10:8096", "reviewer", "1test2")).toBe(false);
  });

  it("rejects another username on the demo host", () => {
    expect(isDemoCredentials("demo.jellyboxd", "admin", "1test2")).toBe(false);
  });
});

describe("isDemoServerUrl", () => {
  it("is true only for the demo:// scheme", () => {
    expect(isDemoServerUrl("demo://local")).toBe(true);
    expect(isDemoServerUrl("http://demo.jellyboxd")).toBe(false);
    expect(isDemoServerUrl("")).toBe(false);
  });
});

describe("createDemoSession", () => {
  it("builds a demo:// session", () => {
    expect(createDemoSession()).toEqual({
      serverUrl: "demo://local",
      token: "demo-token",
      userId: "demo-user",
      userName: "Demo",
    });
  });
});
