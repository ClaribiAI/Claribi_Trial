import FavoriteIcon from '@mui/icons-material/Favorite';

const Navigation = () => {
  const menuItems = [
    {
      text: 'Favorites',
      icon: <FavoriteIcon />,
      path: '/favorites',
      roles: [ROLES.END_USER]
    },
  ];
}; 