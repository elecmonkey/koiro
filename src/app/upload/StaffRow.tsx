"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

type StaffItem = {
  id: string;
  role: string;
  name: string | string[];
};

type StaffRowProps = {
  item: StaffItem;
  onChange: (updates: Partial<StaffItem>) => void;
  onRemove: () => void;
};

export default function StaffRow({ item, onChange, onRemove }: StaffRowProps) {
  // 将 name 统一转换为数组形式进行内部处理
  const names = Array.isArray(item.name) ? item.name : (item.name ? [item.name] : []);
  
  // 是否处于多人编辑模式
  const [isMultiMode, setIsMultiMode] = useState(names.length > 1);
  
  // 用于输入新名字的状态
  const [inputValue, setInputValue] = useState("");

  // 更新 name 的辅助函数，根据数组长度和模式决定存储为 string 还是 string[]
  const updateNames = (newNames: string[]) => {
    const filtered = newNames.filter((n) => n.trim());
    if (filtered.length === 0) {
      onChange({ name: "" });
      setIsMultiMode(false);
    } else if (filtered.length === 1 && !isMultiMode) {
      onChange({ name: filtered[0] });
    } else {
      onChange({ name: filtered });
    }
  };

  // 添加一个名字
  const addName = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (names.includes(trimmed)) {
      setInputValue("");
      return;
    }
    updateNames([...names, trimmed]);
    setInputValue("");
  };

  // 删除一个名字
  const removeName = (index: number) => {
    const newNames = names.filter((_, i) => i !== index);
    // 如果删到只剩一个或没有了，退出多人模式
    if (newNames.filter((n) => n.trim()).length <= 1) {
      setIsMultiMode(false);
    }
    updateNames(newNames);
  };

  // 更新单个名字（非多人模式时）
  const handleSingleNameChange = (value: string) => {
    // 检查是否包含逗号或顿号，自动拆分成多人
    if (value.includes(",") || value.includes("、") || value.includes("，")) {
      const parts = value.split(/[,、，]/).map((s) => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        onChange({ name: parts });
        setIsMultiMode(true);
        return;
      }
    }
    onChange({ name: value });
  };

  // 点击加号进入多人模式
  const enterMultiMode = () => {
    setIsMultiMode(true);
  };

  // 按下回车添加名字
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addName();
    }
  };

  return (
    <Stack spacing={1}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "flex-start" }}>
        <TextField
          label="职责"
          value={item.role}
          onChange={(e) => onChange({ role: e.target.value })}
          sx={{ minWidth: 120, flex: { md: "0 0 150px" } }}
        />
        
        <Box sx={{ flex: 1 }}>
          {isMultiMode ? (
            // 多人模式：显示 Chips + 输入框
            <Stack spacing={1}>
              {names.length > 0 && (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {names.map((name, index) => (
                    <Chip
                      key={index}
                      label={name}
                      onDelete={() => removeName(index)}
                      size="small"
                    />
                  ))}
                </Stack>
              )}
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  label="添加成员"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  size="small"
                  fullWidth
                  placeholder="输入姓名后按回车"
                />
                <IconButton
                  size="small"
                  onClick={addName}
                  disabled={!inputValue.trim()}
                >
                  <AddIcon />
                </IconButton>
              </Stack>
            </Stack>
          ) : (
            // 单人模式：普通输入框 + 添加按钮
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                label="姓名"
                value={names[0] || ""}
                onChange={(e) => handleSingleNameChange(e.target.value)}
                fullWidth
                placeholder="多人可用逗号分隔"
                helperText={names.length === 1 && names[0] ? "点击 + 添加更多成员" : undefined}
              />
              {names.length > 0 && names[0] && (
                <Tooltip title="添加更多成员">
                  <IconButton
                    size="small"
                    onClick={enterMultiMode}
                    sx={{ mt: 1.5 }}
                  >
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          )}
        </Box>

        <Button
          color="error"
          onClick={onRemove}
          sx={{ minWidth: 64, height: { md: 56 } }}
        >
          删除
        </Button>
      </Stack>
    </Stack>
  );
}
