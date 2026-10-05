// API Service for Portfolio Frontend
const API_BASE_URL = 'http://localhost:3001/api'

export interface Project {
    id: string
    title: string
    descriptionEN: string | null
    descriptionID: string | null
    category: string
    image: string | null
    tags: string | null
    liveUrl: string | null
    repoUrl: string | null
    isPublic: boolean
    createdAt: string
    updatedAt: string
}

export interface Experience {
    id: string
    title: string
    company: string
    location: string | null
    period: string
    descriptionEN: string | null
    descriptionID: string | null
    skills: string | null
    isCurrent: boolean
    createdAt: string
    updatedAt: string
}

export interface Skill {
    id: string
    name: string
    category: string | null
    icon: string | null
    proficiency: number
    isPublic: boolean
}

export interface About {
    id: string
    nameEN: string | null
    nameID: string | null
    titleEN: string | null
    titleID: string | null
    bioEN: string | null
    bioID: string | null
    location: string | null
    email: string | null
    phone: string | null
    avatar: string | null
}

export interface TrainerExperience {
    id: string
    title: string
    organization: string | null
    location: string | null
    period: string | null
    descriptionEN: string | null
    descriptionID: string | null
    studentsCount: number | null
    isCurrent: boolean
}

export interface TrainingService {
    id: string
    titleEN: string | null
    titleID: string | null
    descriptionEN: string | null
    descriptionID: string | null
    price: string | null
    duration: string | null
    isActive: boolean
}

// API Functions
export async function fetchProjects(): Promise<Project[]> {
    try {
        const res = await fetch(`${API_BASE_URL}/projects`)
        if (!res.ok) throw new Error('Failed to fetch projects')
        return await res.json()
    } catch (error) {
        console.error('Error fetching projects:', error)
        return []
    }
}

export async function fetchExperiences(): Promise<Experience[]> {
    try {
        const res = await fetch(`${API_BASE_URL}/experiences`)
        if (!res.ok) throw new Error('Failed to fetch experiences')
        return await res.json()
    } catch (error) {
        console.error('Error fetching experiences:', error)
        return []
    }
}

export async function fetchSkills(): Promise<Skill[]> {
    try {
        const res = await fetch(`${API_BASE_URL}/skills`)
        if (!res.ok) throw new Error('Failed to fetch skills')
        return await res.json()
    } catch (error) {
        console.error('Error fetching skills:', error)
        return []
    }
}

export async function fetchAbout(): Promise<About | null> {
    try {
        const res = await fetch(`${API_BASE_URL}/about`)
        if (!res.ok) throw new Error('Failed to fetch about')
        return await res.json()
    } catch (error) {
        console.error('Error fetching about:', error)
        return null
    }
}

export async function fetchTrainerExperiences(): Promise<TrainerExperience[]> {
    try {
        const res = await fetch(`${API_BASE_URL}/trainer`)
        if (!res.ok) throw new Error('Failed to fetch trainer experiences')
        return await res.json()
    } catch (error) {
        console.error('Error fetching trainer experiences:', error)
        return []
    }
}

export async function fetchServices(): Promise<TrainingService[]> {
    try {
        const res = await fetch(`${API_BASE_URL}/services`)
        if (!res.ok) throw new Error('Failed to fetch services')
        return await res.json()
    } catch (error) {
        console.error('Error fetching services:', error)
        return []
    }
}
