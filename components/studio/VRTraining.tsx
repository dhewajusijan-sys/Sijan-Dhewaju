import React from 'react';

const USE_CASES = [
  {
    area: 'Safety & Industrial',
    useCase: 'Emergency response, fire safety, working at heights, equipment operation (e.g., crane, forklift).',
    benefit: 'Practice high-risk procedures without fear of injury or damage to expensive equipment.',
    icon: '🏗️',
    image: 'https://images.pexels.com/photos/577210/pexels-photo-577210.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    area: 'Healthcare',
    useCase: 'Surgical practice, nursing procedures, administering anesthesia, patient communication.',
    benefit: 'Repeat complex procedures to build muscle memory and practice decision-making in high-pressure situations.',
    icon: '⚕️',
    image: 'https://images.pexels.com/photos/3992870/pexels-photo-3992870.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    area: 'Soft Skills',
    useCase: 'Leadership training, sales pitches, customer service interactions, diversity and inclusion training.',
    benefit: 'AI-driven characters provide realistic interaction and immediate, objective feedback on communication.',
    icon: '🤝',
    image: 'https://images.pexels.com/photos/3184398/pexels-photo-3184398.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    area: 'Technical & Maintenance',
    useCase: 'Step-by-step assembly, repair, and maintenance of complex machinery (e.g., aircraft, manufacturing lines).',
    benefit: 'Learn by doing on virtual twins of equipment, reducing machine downtime and travel costs.',
    icon: '⚙️',
    image: 'https://images.pexels.com/photos/4317157/pexels-photo-4317157.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    area: 'Onboarding',
    useCase: 'Virtual tours of the facility, company culture immersion, initial procedural training.',
    benefit: 'New hires are onboarded faster and more confidently with a memorable, engaging experience.',
    icon: '🏢',
    image: 'https://images.pexels.com/photos/1181359/pexels-photo-1181359.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
   {
    area: 'Retail',
    useCase: 'Customer interaction simulation, store layout optimization, and inventory management.',
    benefit: 'Train staff on customer service excellence and test new store designs virtually before implementation.',
    icon: '🛒',
    image: 'https://images.pexels.com/photos/5699475/pexels-photo-5699475.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
];

const VRTraining: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 h-full flex flex-col overflow-y-auto">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold">VR Training: Immersive Learning</h3>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mt-2">
          A transformative approach to corporate and industrial learning that uses immersive, 3D simulated environments to provide hands-on practice without real-world risk.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {USE_CASES.map((item) => (
          <div key={item.area} className="bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex flex-col group transition-all hover:shadow-lg hover:-translate-y-1">
            <div className="w-full h-32 bg-slate-200 dark:bg-slate-700 rounded-md overflow-hidden mb-3">
                 <img src={item.image} alt={item.area} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{item.icon}</span>
              <h4 className="font-bold text-lg text-brand-primary">{item.area}</h4>
            </div>
            <p className="text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">Use Cases:</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 flex-grow">{item.useCase}</p>
            <button disabled className="w-full mt-auto py-2 bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-md font-semibold text-sm cursor-not-allowed">Launch Simulation</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VRTraining;
