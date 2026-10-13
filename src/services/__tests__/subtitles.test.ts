import { JellyfinService, type MediaStreamInfo } from "../jellyfin";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const audio: MediaStreamInfo = { Type: "Audio", Index: 1, IsDefault: true };
const srt: MediaStreamInfo = { Type: "Subtitle", Index: 2, Codec: "subrip", IsTextSubtitleStream: true };
const pgs: MediaStreamInfo = { Type: "Subtitle", Index: 3, Codec: "PGSSUB", IsTextSubtitleStream: false };

describe("subtitle delivery", () => {
  it("lists text subtitles in the HLS manifest, none selected, when there's no default one", () => {
    expect(JellyfinService.pickDefaultStreams([audio, srt, pgs])).toEqual({
      audioStreamIndex: 1,
      subtitleStreamIndex: -1,
      subtitleMethod: "Hls",
    });
  });

  it("selects a default text subtitle in the manifest", () => {
    expect(JellyfinService.pickDefaultStreams([audio, { ...srt, IsDefault: true }])).toMatchObject({
      subtitleStreamIndex: 2,
      subtitleMethod: "Hls",
    });
  });

  it("burns in a default image-based subtitle", () => {
    expect(JellyfinService.pickDefaultStreams([audio, srt, { ...pgs, IsDefault: true }])).toMatchObject({
      subtitleStreamIndex: 3,
      subtitleMethod: "Encode",
    });
  });

  it("passes the subtitle method to Jellyfin", () => {
    const url = JellyfinService.getStreamUrl("http://srv", "abc", "tok", {
      subtitleStreamIndex: -1,
      subtitleMethod: "Hls",
    });
    expect(url).toContain("&SubtitleStreamIndex=-1&SubtitleMethod=Hls");
  });
});
