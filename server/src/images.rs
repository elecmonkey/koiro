//! 封面图片：按文件头识别格式（不信任客户端声明的类型），原样存储不做转码

pub const MAX_IMAGE_BYTES: usize = 30 * 1024 * 1024;

pub struct ValidatedImage {
    pub ext: &'static str,
    pub content_type: &'static str,
}

pub fn detect(bytes: &[u8]) -> Option<ValidatedImage> {
    let (ext, content_type) = match bytes {
        [0xFF, 0xD8, 0xFF, ..] => ("jpg", "image/jpeg"),
        [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A, ..] => ("png", "image/png"),
        [b'R', b'I', b'F', b'F', _, _, _, _, b'W', b'E', b'B', b'P', ..] => ("webp", "image/webp"),
        [b'G', b'I', b'F', b'8', b'7' | b'9', b'a', ..] => ("gif", "image/gif"),
        _ => return None,
    };
    Some(ValidatedImage { ext, content_type })
}

#[cfg(test)]
mod tests {
    use super::detect;

    #[test]
    fn detects_by_magic_bytes() {
        assert_eq!(detect(&[0xFF, 0xD8, 0xFF, 0xE0, 0]).unwrap().ext, "jpg");
        assert_eq!(detect(b"\x89PNG\r\n\x1a\n....").unwrap().ext, "png");
        assert_eq!(detect(b"RIFF\0\0\0\0WEBPVP8 ").unwrap().ext, "webp");
        assert_eq!(detect(b"GIF89a...").unwrap().ext, "gif");
        assert!(detect(b"not an image").is_none());
        assert!(detect(b"RIFF\0\0\0\0WAVEfmt ").is_none());
        assert!(detect(&[]).is_none());
    }
}
