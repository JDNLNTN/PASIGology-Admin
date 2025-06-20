import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import BuildIcon from '@mui/icons-material/Build';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import PersonPinIcon from '@mui/icons-material/PersonPin';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

export default function DialogueLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleManageClick = (path) => {
    console.log('Navigating to:', path); // Debug log
    navigate(path, { replace: true });
  };

  const menuItems = [
    { text: 'Introduction', icon: <HomeIcon />, path: '/dialogue/introduction' },
    { text: 'Mechanics', icon: <BuildIcon />, path: '/dialogue/mechanics' },
    { text: 'Player Room', icon: <MeetingRoomIcon />, path: '/dialogue/playerroom' },
    { text: 'Living Room', icon: <MeetingRoomIcon />, path: '/dialogue/livingroom' },
    { text: 'Lolita', icon: <PersonPinIcon />, path: '/dialogue/lolita' },
    { text: 'Kuya Rene', icon: <PersonAddIcon />, path: '/dialogue/kuyarene' },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Sidebar Navigation */}
      <Paper
        sx={{
          width: 240,
          minHeight: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          p: 2,
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Dialogue Management
        </Typography>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => handleManageClick(item.path)}
                selected={location.pathname === item.path}
                sx={{
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: '240px',
          p: 3,
        }}
      >
        {children}
      </Box>
    </Box>
  );
} 