import { useState } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  Box,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';

/** 安装 Agent Skill 的命令：安装包和站点地址都取当前站点 */
function installCommand() {
  const origin = window.location.origin;
  return `npx -y ${origin}/downloads/koiro-installer.tgz --site ${origin}`;
}

export default function AgentSkillCard() {
  const command = installCommand();
  const [copied, setCopied] = useState<boolean | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Agent Skill
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          让 Codex 或 Claude Code
          以你的身份和权限查找、整理、上传歌曲。在终端中运行以下命令，选择要安装到的
          Agent（需要 Node.js 22 或更新版本）。首次使用时 Agent
          会请你在浏览器里确认登录。
        </Typography>
        <Box
          sx={{
            alignItems: 'center',
            bgcolor: 'action.hover',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            display: 'flex',
            gap: 1,
            pl: 2,
            pr: 1,
            py: 1,
          }}
        >
          <Box
            component="code"
            sx={{
              flex: 1,
              fontFamily: 'monospace',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {command}
          </Box>
          <Tooltip
            title={
              copied === null
                ? '复制'
                : copied
                  ? '已复制'
                  : '复制失败，请手动复制'
            }
          >
            <IconButton aria-label="复制安装命令" size="small" onClick={copy}>
              {copied ? (
                <CheckIcon fontSize="small" />
              ) : (
                <ContentCopyIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
}
