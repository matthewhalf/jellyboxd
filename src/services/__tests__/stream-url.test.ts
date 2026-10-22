import { JellyfinService } from "../jellyfin";

const params = (url: string) => new URL(url).searchParams;

describe("getStreamUrl", () => {
  it("asks for fMP4 segments, since AVPlayer can't play HEVC in MPEG-TS", () => {
    expect(params(JellyfinService.getStreamUrl("http://srv", "abc", "tok")).get("SegmentContainer")).toBe("mp4");
    expect(
      params(JellyfinService.getStreamUrl("http://srv", "abc", "tok", { maxStreamingBitrate: 10000000 })).get(
        "SegmentContainer"
      )
    ).toBe("mp4");
  });

  it("lets Direct Play copy HEVC/H.264 video, HDR and Dolby Vision included", () => {
    const p = params(JellyfinService.getStreamUrl("http://srv", "abc", "tok"));
    expect(p.get("VideoCodec")).toBe("hevc,h264");
    expect(p.get("AllowVideoStreamCopy")).toBe("true");
    expect(p.get("hevc-videorangetype")).toContain("HDR10");
    expect(p.get("hevc-videorangetype")).toContain("DOVIWithHDR10");
    expect(p.get("MaxStreamingBitrate")).toBeNull();
  });

  it("transcodes capped presets to SDR H.264 at the preset's resolution", () => {
    const p = params(JellyfinService.getStreamUrl("http://srv", "abc", "tok", { maxStreamingBitrate: 10000000 }));
    expect(p.get("MaxStreamingBitrate")).toBe("10000000");
    expect(p.get("VideoCodec")).toBe("h264");
    expect(p.get("MaxWidth")).toBe("1920");
    expect(p.get("MaxHeight")).toBe("1080");
    expect(p.get("h264-videorangetype")).toBe("SDR");
  });
});
