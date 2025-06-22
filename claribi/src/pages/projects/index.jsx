import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, InputAdornment, Chip, Avatar } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ProjectCard from '../home/ProjectCard';
import UserProjectCard from '../home/UserProjectCard';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import RoleBasedComponent from '../../components/auth/RoleBasedComponent';
import { useAuth, ROLES } from '../../contexts/AuthContext';
import { useProjects } from '../../contexts/ProjectContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatLastModified } from '../../utils/dateUtils';
import projectService from '../../services/projectService';

const ProjectsPage = () => {
  const { currentUser } = useAuth();
  const { projects: projectsFromContext, loading, error, fetchProjects, createProject, deleteProject, editProject } = useProjects();
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDuplicateConfirmOpen, setIsDuplicateConfirmOpen] = useState(false);
  
  // Process projects to include formatted lastModified
  const projects = Array.isArray(projectsFromContext) 
    ? projectsFromContext.map(project => ({
        ...project,
        lastModified: formatLastModified(project.updated_at || project.created_at)
      }))
    : [];

  const handleAddProject = () => {
    setIsAddProjectModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddProjectModalOpen(false);
    setNewProjectName('');
    setNewProjectDescription('');
    setIsDuplicateConfirmOpen(false);
  };

  const handleCreateProject = async () => {
    if (newProjectName.trim()) {
      try {
        // Check if a project with this name already exists
        const duplicateProject = projects.find(
          project => project.name.toLowerCase() === newProjectName.trim().toLowerCase()
        );
        
        if (duplicateProject && !isDuplicateConfirmOpen) {
          // If duplicate found and confirmation not shown yet, show confirmation
          setIsDuplicateConfirmOpen(true);
          return;
        }
        
        // If no duplicate or user confirmed, create the project
        await createProject({
          name: newProjectName,
          description: newProjectDescription || 'No description provided'
        });
        handleCloseModal();
        setIsDuplicateConfirmOpen(false);
      } catch (err) {
        // Error handling managed by context
      }
    }
  };

  const handleToggleStatus = (id) => {
    // This would be replaced with an API call
  };

  const handleEditProject = async (updatedProject) => {
    try {
      const current = projects.find(p => p.id === updatedProject.id);
      if (updatedProject.status && current && updatedProject.status !== current.status) {
        await projectService.updateProjectStatus(updatedProject.id, updatedProject.status);
      }
      await editProject(updatedProject.id, { 
        name: updatedProject.name, 
        description: updatedProject.description 
      });
      // Refetch projects to update UI with latest backend data
      fetchProjects();
    } catch (err) {
      // Error handling managed by context
    }
  };

  const handleDeleteProject = async (id) => {
    try {
      await deleteProject(id);
    } catch (err) {
      // Error handling managed by context
    }
  };

  // Display loading spinner while fetching data
  if (loading) {
    return <LoadingSpinner />;
  }

  // Filter projects based on search query and sort by last modified date
  const filteredProjects = projects
    .filter(project => 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || 0);
      const dateB = new Date(b.updated_at || b.created_at || 0);
      return dateB - dateA;
    });

  // Render data analyst project cards
  const renderAnalystProjectCards = () => (
    filteredProjects.length > 0 ? (
      filteredProjects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onEdit={handleEditProject}
          onDelete={() => handleDeleteProject(project.id)}
          onToggleStatus={() => handleToggleStatus(project.id)}
        />
      ))
    ) : (
      <EmptyProjectsMessage onAddProject={handleAddProject} />
    )
  );

  // Render user project cards
  const renderUserProjectCards = () => (
    filteredProjects.filter(project => project.status === 'Live').length > 0 ?
      filteredProjects
        .filter(project => project.status === 'Live')
        .map((project) => (
          <UserProjectCard
            key={project.id}
            project={project}
            onLeave={() => handleDeleteProject(project.id)}
          />
        ))
      : <EmptyProjectsMessage showAddButton={false} />
  );

  // Empty state component with conditional add button
  const EmptyProjectsMessage = ({ onAddProject, showAddButton = true }) => (
    <Box sx={{ 
      textAlign: 'center', 
      py: 8,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      color: 'rgba(0, 0, 0, 0.4)'
    }}>
      <SearchIcon sx={{ fontSize: '3rem', opacity: 0.6 }} />
      <Typography variant="body1" color="text.secondary" sx={{ fontFamily: "'Nunito Sans', sans-serif" }}>
        No projects found matching your search.
      </Typography>
      {showAddButton && (
        <Button
          variant="outlined"
          color="primary"
          startIcon={<AddIcon />}
          onClick={onAddProject}
          sx={{
            mt: 2,
            borderRadius: '12px',
            fontFamily: "'Nunito Sans', sans-serif",
            color: '#555555',
            borderColor: '#555555',
            '&:hover': {
              borderColor: '#333333',
              color: '#FCC000'
            }
          }}
        >
          Create a new project
        </Button>
      )}
    </Box>
  );

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: { xs: 3, md: 4 },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 },
        width: '100%'
      }}>
        <Box>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              fontSize: { xs: '1.8rem', md: '2rem' },
              color: '#333',
              mb: 0.5
            }}
          >
            Projects
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: 'rgba(0, 0, 0, 0.6)',
              fontFamily: "'Inter', sans-serif",
              fontSize: '1rem'
            }}
          >
            Manage and organize your project collection
          </Typography>
        </Box>
        
        {/* Only show Add Project button for Data Analysts */}
        <RoleBasedComponent
          dataAnalystComponent={
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddProject}
              sx={{
                borderRadius: '12px',
                px: 3,
                py: 1.2,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                bgcolor: '#555555',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: '#333333',
                  boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              Add project
            </Button>
          }
        />
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search projects..."
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'rgba(0, 0, 0, 0.4)' }} />
              </InputAdornment>
            ),
          }}
          sx={{ 
            bgcolor: 'white',
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              transition: 'all 0.2s',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              '&:hover': {
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
              },
              '&.Mui-focused': {
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }
            },
            '& .MuiInputBase-input': {
              fontFamily: "'Nunito Sans', sans-serif",
              py: 1.5
            }
          }}
        />
      </Box>

      {/* Display appropriate project cards based on role */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        flex: 1,
        overflow: 'auto'
      }}>
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
        
        <RoleBasedComponent
          dataAnalystComponent={renderAnalystProjectCards()}
          userComponent={renderUserProjectCards()}
        />
      </Box>

      {/* Add Project Modal */}
        <Modal
          open={isAddProjectModalOpen}
          onClose={handleCloseModal}
        title="Create a new project"
        contentSx={{ 
          width: { xs: '90%', sm: '450px' },
          maxWidth: '90vw',
          p: { xs: 3, sm: 4 },
              borderRadius: '16px',
        }}
      >
        <Box sx={{ mb: 3 }}>
              <Typography 
                component="label" 
                htmlFor="project-name" 
                sx={{ 
              display: 'block', 
                  mb: 1, 
              fontFamily: "'Nunito Sans', sans-serif",
              fontWeight: 600
                }}
              >
            Project name
              </Typography>
              <TextField
                id="project-name"
                fullWidth
                placeholder="Enter project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                  }
                }}
              />
            </Box>
            
        <Box sx={{ mb: 4 }}>
              <Typography 
                component="label" 
                htmlFor="project-description" 
                sx={{ 
              display: 'block', 
                  mb: 1, 
              fontFamily: "'Nunito Sans', sans-serif",
              fontWeight: 600
                }}
              >
            Description (optional)
              </Typography>
              <TextField
                id="project-description"
                fullWidth
                multiline
                rows={3}
                placeholder="Enter project description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                  }
                }}
              />
            </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleCloseModal}
            sx={{
              borderRadius: '8px',
              color: '#555555',
              borderColor: 'rgba(0,0,0,0.2)',
              '&:hover': {
                borderColor: 'rgba(0,0,0,0.4)',
              }
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateProject}
            disabled={!newProjectName.trim()}
            sx={{
              borderRadius: '8px',
              bgcolor: '#555555',
              '&:hover': {
                bgcolor: '#333333',
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(0, 0, 0, 0.12)',
              }
            }}
          >
            Create project
          </Button>
          </Box>
        </Modal>
        
        {/* Duplicate Project Name Confirmation Modal */}
        <Modal
          open={isDuplicateConfirmOpen}
          onClose={() => setIsDuplicateConfirmOpen(false)}
          title="Project name already exists"
          contentSx={{ 
            width: { xs: '90%', sm: '450px' },
            maxWidth: '90vw',
            p: { xs: 3, sm: 4 },
            borderRadius: '16px',
          }}
        >
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="body1" 
              sx={{ 
                fontFamily: "'Nunito Sans', sans-serif",
                mb: 2
              }}
            >
              A project with the name "{newProjectName}" already exists. Are you sure you want to create another project with the same name?
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setIsDuplicateConfirmOpen(false)}
              sx={{
                borderRadius: '8px',
                color: '#555555',
                borderColor: 'rgba(0,0,0,0.2)',
                '&:hover': {
                  borderColor: 'rgba(0,0,0,0.4)',
                }
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateProject}
              sx={{
                borderRadius: '8px',
                bgcolor: '#555555',
                '&:hover': {
                  bgcolor: '#333333',
                }
              }}
            >
              Create anyway
            </Button>
          </Box>
        </Modal>
    </Box>
  );
};

export default ProjectsPage;