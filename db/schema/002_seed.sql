-- ============================================================
-- Seed data for development and testing
-- ============================================================

-- Insert test users (passwords are bcrypt hashes of "password123")
INSERT INTO users (email, password, full_name, role) VALUES
    ('admin@university.edu',   '$2a$12$LJ3m4ys3Lz0YKn1QxZvCxOeJwMnqz8KHjKjGhN1mR5pV3sT7u8Wy', 'System Admin',     'admin'),
    ('prof.smith@university.edu', '$2a$12$LJ3m4ys3Lz0YKn1QxZvCxOeJwMnqz8KHjKjGhN1mR5pV3sT7u8Wy', 'Dr. Jane Smith',   'faculty'),
    ('prof.jones@university.edu', '$2a$12$LJ3m4ys3Lz0YKn1QxZvCxOeJwMnqz8KHjKjGhN1mR5pV3sT7u8Wy', 'Dr. Robert Jones', 'faculty'),
    ('student1@university.edu',   '$2a$12$LJ3m4ys3Lz0YKn1QxZvCxOeJwMnqz8KHjKjGhN1mR5pV3sT7u8Wy', 'Alice Johnson',    'student'),
    ('student2@university.edu',   '$2a$12$LJ3m4ys3Lz0YKn1QxZvCxOeJwMnqz8KHjKjGhN1mR5pV3sT7u8Wy', 'Bob Williams',     'student');

-- Insert test courses
INSERT INTO courses (code, name, department, semester) VALUES
    ('CS101', 'Introduction to Computer Science', 'Computer Science', 'Fall 2025'),
    ('CS201', 'Data Structures & Algorithms',     'Computer Science', 'Fall 2025'),
    ('MATH301', 'Linear Algebra',                 'Mathematics',      'Fall 2025');
