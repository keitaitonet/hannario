"use client";

import ArticleIcon from "@mui/icons-material/Article";
import GroupIcon from "@mui/icons-material/Group";
import HistoryIcon from "@mui/icons-material/History";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import SendIcon from "@mui/icons-material/Send";
import SettingsIcon from "@mui/icons-material/Settings";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import hannarioLogo from "@/assets/hannario.png";

const drawerWidth = 240;

const navItems = [
  { href: "/", label: "Home", icon: <HomeIcon /> },
  { href: "/send", label: "送信", icon: <SendIcon /> },
  { href: "/logs", label: "ログ", icon: <ArticleIcon /> },
  { href: "/audit", label: "監査ログ", icon: <HistoryIcon /> },
  { href: "/admin/users", label: "ユーザー管理", icon: <GroupIcon /> },
  { href: "/settings", label: "設定", icon: <SettingsIcon /> },
];

export function AppShell({
  userDisplayName,
  children,
}: {
  userDisplayName: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);
  const accountOpen = Boolean(accountAnchor);

  const handleDrawerClose = () => {
    setIsClosing(true);
    setMobileOpen(false);
  };
  const handleDrawerTransitionEnd = () => {
    setIsClosing(false);
  };
  const handleDrawerToggle = () => {
    if (!isClosing) setMobileOpen((prev) => !prev);
  };

  const handleAccountOpen = (e: React.MouseEvent<HTMLElement>) =>
    setAccountAnchor(e.currentTarget);
  const handleAccountClose = () => setAccountAnchor(null);

  const drawerContent = (
    <>
      <Toolbar />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.href} disablePadding>
            <ListItemButton
              component={Link}
              href={item.href}
              onClick={handleDrawerClose}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Image
              src={hannarioLogo}
              alt="はんなり男"
              width={36}
              height={36}
              priority
            />
            <Typography variant="h6" component="div">
              はんなり男
            </Typography>
          </Box>
          <Button
            color="inherit"
            variant="text"
            onClick={handleAccountOpen}
            aria-controls={accountOpen ? "account-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={accountOpen ? "true" : undefined}
            startIcon={
              <Avatar sx={{ width: 28, height: 28, fontSize: 14 }}>
                {userDisplayName.charAt(0).toUpperCase()}
              </Avatar>
            }
          >
            {userDisplayName}
          </Button>
          <Menu
            id="account-menu"
            anchorEl={accountAnchor}
            open={accountOpen}
            onClose={handleAccountClose}
            onClick={handleAccountClose}
          >
            <MenuItem component="a" href="/sign-out">
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              ログアウト
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="navigation"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onTransitionEnd={handleDrawerTransitionEnd}
          onClose={handleDrawerClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
