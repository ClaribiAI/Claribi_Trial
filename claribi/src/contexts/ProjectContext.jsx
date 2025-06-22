import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import projectService from '../services/projectService';
import { useAuth } from './AuthContext';
import { formatLastModified } from '../utils/dateUtils';

// Create the context
const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 50,
    total: 0,
    totalPages: 0
  });
  const { isAuthenticated } = useAuth();

  // Fetch all projects when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated]);

  // Memoize the functions
  const fetchProjects = useCallback(async (page = 1, perPage = 50, filters = {}) => {
    try {
      setLoading(true);
      const response = await projectService.getProjects(page, perPage, filters);
      
      if (response && response.items) {
        const formattedProjects = response.items.map(project => ({
          ...project,
          lastModified: formatLastModified(project.updated_at || project.created_at)
        }));
        
        setProjects(formattedProjects);
        setPagination({
          page: page,
          perPage: perPage,
          total: response.metadata?.total || 0,
          totalPages: response.metadata?.total_pages || 0
        });
        setError(null);
      } else {
        setError('API returned unexpected data format');
        setProjects([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed as all used functions/values are stable

  const fetchProject = useCallback(async (projectId) => {
    if (!projectId) return null;
    
    try {
      setLoading(true);
      const project = await projectService.getProject(projectId);
      
      // Batch state updates
      const updates = () => {
        setCurrentProject(project);
        setError(null);
      };
      updates();
      
      return project;
    } catch (err) {
      // Batch state updates
      const updates = () => {
        setError(err.message);
        setCurrentProject(null);
      };
      updates();
      
      return null;
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed as all used functions/values are stable

  const createProject = async (projectData) => {
    try {
      setLoading(true);
      const newProject = await projectService.createProject(projectData);
      
      // Format the project data with proper lastModified field
      const formattedProject = {
        ...newProject,
        lastModified: formatLastModified(newProject.updated_at || newProject.created_at)
      };
      
      // Add the new project to the projects list and refetch to maintain pagination
      await fetchProjects(pagination.page, pagination.perPage);
      setError(null);
      return formattedProject;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId) => {
    try {
      await projectService.deleteProject(projectId);
      // Refetch projects to maintain pagination
      await fetchProjects(pagination.page, pagination.perPage);
      if (currentProject && currentProject.id === projectId) {
        setCurrentProject(null);
      }
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const editProject = async (projectId, projectData) => {
    try {
      const updatedProject = await projectService.editProject(projectId, projectData);
      
      // Update the project in the projects array
      const updatedProjects = projects.map(project => 
        project.id === projectId ? { ...project, ...updatedProject } : project
      );
      setProjects(updatedProjects);
      
      // Update currentProject if it's the one being edited
      if (currentProject && currentProject.id === projectId) {
        setCurrentProject({ ...currentProject, ...updatedProject });
      }
      
      setError(null);
      return updatedProject;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  // Project status update
  const updateProjectStatus = async (projectId, newStatus) => {
    try {
      const updatedProject = await projectService.updateProjectStatus(projectId, newStatus);
      
      // Update the project in the projects array
      const updatedProjects = projects.map(project => 
        project.id === projectId ? { ...project, ...updatedProject } : project
      );
      setProjects(updatedProjects);
      
      // Update currentProject if it's the one being edited
      if (currentProject && currentProject.id === projectId) {
        setCurrentProject({ ...currentProject, ...updatedProject });
      }
      
      setError(null);
      return updatedProject;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  // Project sharing methods
  const shareProject = async (projectId, accessType, expirationHours) => {
    try {
      setLoading(true);
      
      // Ensure accessType has a valid value
      if (!accessType || (accessType !== 'reader' && accessType !== 'co_owner')) {
        accessType = 'reader';
      }
      
      // Pass parameters in the correct order, making sure expirationHours is a string
      const response = await projectService.shareProject(
        projectId, 
        accessType, 
        expirationHours !== null && expirationHours !== undefined ? String(expirationHours) : null
      );
      
      // Return the response data directly since it already has the correct format
      if (response) {
        setError(null);
        return response;
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      const errorMessage = err.userMessage || err.message || 'Failed to share project';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const extendProjectShare = async (projectId, extensionHours, accessType) => {
    try {
      setLoading(true);
      const response = await projectService.extendProjectShare(projectId, extensionHours, accessType);
      
      if (response && response.data && response.data.success) {
        setError(null);
        return response.data;
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      const errorMessage = err.userMessage || err.message || 'Failed to extend project share';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const revokeProjectShare = async (projectId, revokeAccess = false, accessType = null) => {
    try {
      setLoading(true);
      
      const response = await projectService.revokeProjectShare(projectId, revokeAccess, accessType);
      
      if (response && response.data && response.data.success) {
        setError(null);
        return response.data;
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      const errorMessage = err.userMessage || err.message || 'Failed to revoke project share';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getProjectSharingInfo = async (projectId) => {
    try {
      setLoading(true);
      const response = await projectService.getProjectSharingInfo(projectId);
      
      if (response && response.data) {
        setError(null);
        return response.data;
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      const errorMessage = err.userMessage || err.message || 'Failed to get project sharing info';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Memoize the context value
  const value = React.useMemo(() => ({
    projects,
    currentProject,
    loading,
    error,
    pagination,
    fetchProjects,
    fetchProject,
    createProject,
    deleteProject,
    editProject,
    updateProjectStatus,
    shareProject,
    extendProjectShare,
    revokeProjectShare,
    getProjectSharingInfo
  }), [
    projects,
    currentProject,
    loading,
    error,
    pagination,
    fetchProjects,
    fetchProject,
    createProject,
    deleteProject,
    editProject,
    updateProjectStatus,
    shareProject,
    extendProjectShare,
    revokeProjectShare,
    getProjectSharingInfo
  ]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => useContext(ProjectContext);

export default ProjectContext; 