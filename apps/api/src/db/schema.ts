import { mysqlTable, varchar, text, timestamp, boolean, int } from 'drizzle-orm/mysql-core'

// Users table
export const users = mysqlTable('users', {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: text('name').notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerified: boolean('email_verified').default(false),
    image: text('image'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

// Sessions table for Better Auth
export const sessions = mysqlTable('sessions', {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

// Accounts table for Better Auth
export const accounts = mysqlTable('accounts', {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: varchar('provider_id', { length: 255 }).notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    idToken: text('id_token'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

// Verification tokens
export const verifications = mysqlTable('verifications', {
    id: varchar('id', { length: 36 }).primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
})

// Projects table
export const projects = mysqlTable('projects', {
    id: varchar('id', { length: 36 }).primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    descriptionEN: text('description_en'),
    descriptionID: text('description_id'),
    category: varchar('category', { length: 100 }).notNull(),
    image: text('image'),
    tags: text('tags'),
    liveUrl: text('live_url'),
    repoUrl: text('repo_url'),
    isPublic: boolean('is_public').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

// Work Experiences table
export const experiences = mysqlTable('experiences', {
    id: varchar('id', { length: 36 }).primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    company: varchar('company', { length: 255 }).notNull(),
    location: varchar('location', { length: 255 }),
    period: varchar('period', { length: 100 }).notNull(),
    descriptionEN: text('description_en'),
    descriptionID: text('description_id'),
    skills: text('skills'),
    isCurrent: boolean('is_current').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

// Skills table
export const skills = mysqlTable('skills', {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    category: varchar('category', { length: 100 }),
    icon: varchar('icon', { length: 100 }),
    proficiency: int('proficiency').default(80),
    isPublic: boolean('is_public').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

// About table
export const about = mysqlTable('about', {
    id: varchar('id', { length: 36 }).primaryKey(),
    nameEN: text('name_en'),
    nameID: text('name_id'),
    titleEN: text('title_en'),
    titleID: text('title_id'),
    bioEN: text('bio_en'),
    bioID: text('bio_id'),
    location: varchar('location', { length: 255 }),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    avatar: text('avatar'),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

// Trainer Experiences table
export const trainerExperiences = mysqlTable('trainer_experiences', {
    id: varchar('id', { length: 36 }).primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    organization: varchar('organization', { length: 255 }),
    location: varchar('location', { length: 255 }),
    period: varchar('period', { length: 100 }),
    descriptionEN: text('description_en'),
    descriptionID: text('description_id'),
    studentsCount: int('students_count'),
    isCurrent: boolean('is_current').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

// Training Services table
export const trainingServices = mysqlTable('training_services', {
    id: varchar('id', { length: 36 }).primaryKey(),
    titleEN: varchar('title_en', { length: 255 }),
    titleID: varchar('title_id', { length: 255 }),
    descriptionEN: text('description_en'),
    descriptionID: text('description_id'),
    price: varchar('price', { length: 100 }),
    duration: varchar('duration', { length: 100 }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

// Settings table
export const settings = mysqlTable('settings', {
    id: varchar('id', { length: 36 }).primaryKey(),
    keyName: varchar('key_name', { length: 255 }).unique(),
    value: text('value'),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})
