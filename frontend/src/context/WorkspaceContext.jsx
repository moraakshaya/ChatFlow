import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext();

export const WorkspaceProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [projects, setProjects] = useState([]);
    const [workspaces, setWorkspaces] = useState([]);
    
    const [activeProject, setActiveProject] = useState(null);
    const [activeWorkspace, setActiveWorkspace] = useState(null);
    
    const [isLoading, setIsLoading] = useState(true);

    const fetchHierarchy = useCallback(async () => {
        if (!user || !isAuthenticated) return;
        
        setIsLoading(true);
        try {
            // 1. Fetch Projects for the Organization
            const projRes = await api.get(`/projects/organization/${user.organizationId}`);
            const fetchedProjects = projRes.data.data || [];
            setProjects(fetchedProjects);

            if (fetchedProjects.length > 0) {
                // Set first project as active if none selected
                const currentProj = activeProject || fetchedProjects[0];
                setActiveProject(currentProj);

                // 2. Fetch Workspaces for that Project
                const wsRes = await api.get(`/workspaces/project/${currentProj._id}`);
                const fetchedWorkspaces = wsRes.data.data || [];
                setWorkspaces(fetchedWorkspaces);

                if (fetchedWorkspaces.length > 0) {
                    // Check if current activeWorkspace belongs to this project
                    const wsExists = activeWorkspace && fetchedWorkspaces.find(ws => ws._id === activeWorkspace._id);
                    if (!wsExists) {
                        setActiveWorkspace(fetchedWorkspaces[0]);
                    }
                } else {
                    setActiveWorkspace(null);
                }
            } else {
                setWorkspaces([]);
                setActiveProject(null);
                setActiveWorkspace(null);
            }
        } catch (error) {
            console.error("Failed to fetch workspace hierarchy:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user, isAuthenticated, activeProject, activeWorkspace]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchHierarchy();
        } else {
            // Reset state on logout
            setProjects([]);
            setWorkspaces([]);
            setActiveProject(null);
            setActiveWorkspace(null);
            setIsLoading(false);
        }
    }, [isAuthenticated, user]); // Note: excluding fetchHierarchy to prevent infinite loops during deep state changes

    const switchProject = (project) => {
        setActiveProject(project);
        setActiveWorkspace(null); // Reset workspace when project changes
        // fetchHierarchy will trigger via useEffect or manually if we want
        // To be safe, we can manually trigger a fetch for workspaces
        api.get(`/workspaces/project/${project._id}`).then(wsRes => {
            const fetched = wsRes.data.data || [];
            setWorkspaces(fetched);
            if (fetched.length > 0) setActiveWorkspace(fetched[0]);
        });
    };

    const switchWorkspace = (workspace) => {
        setActiveWorkspace(workspace);
    };

    return (
        <WorkspaceContext.Provider value={{
            projects,
            workspaces,
            activeProject,
            activeWorkspace,
            isLoading,
            switchProject,
            switchWorkspace,
            refreshHierarchy: fetchHierarchy
        }}>
            {children}
        </WorkspaceContext.Provider>
    );
};

export const useWorkspace = () => useContext(WorkspaceContext);
