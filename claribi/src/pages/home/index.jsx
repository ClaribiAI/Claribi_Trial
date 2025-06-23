import React, { useState, useEffect } from 'react';
import { Grid, Box, Container, Typography, Paper } from '@mui/material';
import HomeHeader from './HomeHeader';
import StatsCard from './StatsCard';
import ProjectCard from './ProjectCard';
import UserProjectCard from './UserProjectCard';
import RoleBasedComponent from '../../components/auth/RoleBasedComponent';
import { useAuth, ROLES } from '../../contexts/AuthContext';
import { useProjects } from '../../contexts/ProjectContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatLastModified } from '../../utils/dateUtils';
import { getQueryAnalytics } from '../../services/analyticsService';

const HomePage = () => {
  const { currentUser } = useAuth();
  const { recentProjects, loading, error, fetchRecentProjects, deleteProject } = useProjects();
  const [stats, setStats] = useState({
    queries_done: 0,
    hours_saved: 0,
    loading: true,
    error: null
  });
  
  // Fetch recent projects on component mount
  useEffect(() => {
    fetchRecentProjects(5);
  }, [fetchRecentProjects]);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const analytics = await getQueryAnalytics();
        setStats({
          queries_done: analytics.total_queries,
          hours_saved: analytics.hours_saved,
          loading: false,
          error: null
        });
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setStats(prev => ({
          ...prev,
          loading: false,
          error: err.message
        }));
      }
    };

    fetchAnalytics();
  }, []);

  const handleToggleStatus = (id) => {
    // This would be replaced with an API call
    console.log('Toggle status for project', id);
  };

  const handleEditProject = (updatedProject) => {
    // The actual editing is handled in ProjectContext
    console.log('Edit project', updatedProject);
  };

  const handleDeleteProject = async (id) => {
    try {
      const success = await deleteProject(id);
      if (!success) {
        throw new Error('Failed to delete project');
      }
    } catch (err) {
      // Error handling managed by context and ProjectCard
      throw err;
    }
  };

  // Process projects to include formatted lastModified
  const processedProjects = Array.isArray(recentProjects) 
    ? recentProjects.map(project => ({
        ...project,
        lastModified: formatLastModified(project.updated_at || project.created_at)
      }))
    : [];

  // Format stats for display
  const statsCards = [
    { 
      title: 'Queries done', 
      value: stats.loading ? '...' : stats.queries_done.toLocaleString(), 
      trend: true 
    },
    { 
      title: 'Hours saved', 
      value: stats.loading ? '...' : stats.hours_saved.toLocaleString(undefined, { maximumFractionDigits: 1 }), 
      trend: true 
    },
  ];

  // Render data analyst project cards
  const renderAnalystProjectCards = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <LoadingSpinner size={40} />
        </Box>
      );
    }
    
    if (error) {
      return (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      );
    }
    
    if (processedProjects.length === 0) {
      return (
        <Box sx={{ 
          p: 3, 
          textAlign: 'center', 
          borderRadius: '8px',
          border: '1px dashed rgba(0, 0, 0, 0.12)',
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
          margin: 2
        }}>
          <Typography color="textSecondary">No recent projects found</Typography>
        </Box>
      );
    }
    
    return processedProjects.map((project) => (
      <ProjectCard
        key={project.id}
        project={project}
        onEdit={handleEditProject}
        onDelete={() => handleDeleteProject(project.id)}
        onToggleStatus={() => handleToggleStatus(project.id)}
      />
    ));
  };

  // Render user project cards
  const renderUserProjectCards = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <LoadingSpinner size={40} />
        </Box>
      );
    }
    if (error) {
      return (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      );
    }
    const liveProjects = processedProjects.filter(project => project.status === 'Live');
    if (liveProjects.length === 0) {
      return (
        <Box sx={{ 
          p: 3, 
          textAlign: 'center', 
          borderRadius: '8px',
          border: '1px dashed rgba(0, 0, 0, 0.12)',
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
          margin: 2
        }}>
          <Typography color="textSecondary">No recent projects found</Typography>
        </Box>
      );
    }
    return liveProjects.map((project) => (
      <UserProjectCard
        key={project.id}
        project={project}
      />
    ));
  };

  return (
    <Box sx={{ 
      p: { xs: 2, md: 4 }, 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      <HomeHeader username={currentUser.username}>
        {/* Stats Cards in the header */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          {statsCards.map((stat, index) => (
            <Box key={index} sx={{ width: { xs: '100%', sm: '180px' } }}>
              <StatsCard 
                title={stat.title} 
                value={stat.value} 
                trend={stat.trend}
                error={stats.error}
              />
            </Box>
          ))}
        </Box>
      </HomeHeader>

      {/* Projects Section with Title */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Recent Projects Title */}
        <Box sx={{ 
          pb: 3, 
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 700, 
            fontSize: '1.1rem', 
            fontFamily: "'Inter', sans-serif",
            color: '#333'
          }}>
            Recent Projects
          </Typography>
        </Box>

        {/* Column Headers */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          px: 3,
          py: 2,
          width: '100%',
          bgcolor: 'rgba(0, 0, 0, 0.02)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
          flexDirection: { xs: 'column', sm: 'row' },
          minWidth: 0,
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            width: { xs: '100%', sm: '30%' },
            pl: 6
          }}>
            <Box component="span" sx={{ 
              fontWeight: 600, 
              fontSize: '0.85rem',
              color: '#666',
              fontFamily: "'Inter', sans-serif"
            }}>
              Name
            </Box>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'space-between', sm: 'flex-start' },
            mt: { xs: 1, sm: 0 }
          }}>
            <Box component="span" sx={{ 
              fontWeight: 600, 
              flexShrink: 0, 
              width: '150px',
              textAlign: 'left',
              fontSize: '0.85rem',
              color: '#666',
              fontFamily: "'Inter', sans-serif"
            }}>
              Modified
            </Box>
            <Box sx={{ width: '120px', flexShrink: 0 }}></Box>
          </Box>
        </Box>
        
        {/* Project Cards based on role */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <RoleBasedComponent
            dataAnalystComponent={renderAnalystProjectCards()}
            userComponent={renderUserProjectCards()}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;