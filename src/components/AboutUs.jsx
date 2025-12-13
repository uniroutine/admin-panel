// src/components/AboutUs.jsx
import React from 'react';
import './AboutUs.css'; // Optional CSS for styling

const contributors = [
  {
    name: 'Deep Narayan Banerjee',
    image: 'https://avatars.githubusercontent.com/u/100768018?v=4',
    linkedin: 'https://www.linkedin.com/in/deep-narayan-banerjee-61421a317/',
    github: 'https://github.com/Bearcry55',
  },
  {
    name: 'Santanu Paik',
    image: 'https://avatars.githubusercontent.com/u/100768018?v=4', // Replace with actual GitHub avatar URL
    linkedin: 'https://www.linkedin.com/in/XXX/',
    github: 'https://github.com/xxx',
  },
  {
    name: 'Bidhan Chandra Roy',
    image: 'https://avatars.githubusercontent.com/u/123456789?v=4', // Replace with actual GitHub avatar URL
    linkedin: 'https://www.linkedin.com/in/XXX/',
    github: 'https://github.com/xxx',
  },
  {
    name: 'Saswata Das',
    image: 'https://avatars.githubusercontent.com/u/100768018?v=4', // Replace with actual GitHub avatar URL
    linkedin: 'https://www.linkedin.com/in/dassaswata/',
    github: 'https://github.com/xxx',
  },
  {
    name: 'Subhadip Paul',
    image: 'https://avatars.githubusercontent.com/u/100768018?v=4', // Replace with actual GitHub avatar URL
    linkedin: 'https://www.linkedin.com/in/subhadip-paul23/',
    github: 'https://github.com/SubhadipPaul523',
  },
  {
    name: 'Rakib Ali Raza',
    image: 'https://avatars.githubusercontent.com/u/123456789?v=4', // Replace with actual GitHub avatar URL
    linkedin: 'https://www.linkedin.com/in/XXX/',
    github: 'https://github.com/xxx',
  },
  // Add more contributors here
];

function AboutUs() {
  return (
    <div className="about-page">
      {/* <h2>About Us</h2> */}
      <h2 className="text-2xl font-bold mb-3 text-gray-900">Our Vision</h2>
      <p>We believe that the future of academic planning lies in simplicity and smart automation.
Our platform is a simple digital routine builder designed for teachers — helps to manage subjects, assign teachers, and generate weekly schedules in just a few clicks, ready to share with students anytime.
        </p>
      <div className="card-container">
        {contributors.map((person, index) => (
          <div className="profile-card" key={index}>
            <img src={person.image} alt={person.name} className="profile-image" />
            <h3>{person.name}</h3>
            <div className="links">
              <a href={person.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href={person.github} target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AboutUs;
