import React from 'react';
import TwitterIcon from '@svg/twitter.svg';
import DiscordIcon from '@svg/discord.svg';
import GithubIcon from '@svg/github.svg';

const Socials: React.FC = () => {
  return (
    <div className='fixed right-4 bottom-4 p-2 rounded-xl bg-white bg-opacity-40 backdrop-blur-md w-[170px]'>
      <div className='flex justify-center space-x-4'>
        <a
          href='https://x.com/SuiRewardsMe'
          target='_blank'
          rel='noopener noreferrer'
          className='transform transition-transform duration-300 hover:-rotate-12'
        >
          <TwitterIcon className='w-8 h-8' />
        </a>
        <a
          href='https://discord.gg/suirewardsme'
          target='_blank'
          rel='noopener noreferrer'
          className='transform transition-transform duration-300 hover:-rotate-12'
        >
          <DiscordIcon className='w-8 h-8' />
        </a>
        <a
          href='https://github.com'
          target='_blank'
          rel='noopener noreferrer'
          className='transform transition-transform duration-300 hover:-rotate-12'
        >
          <GithubIcon className='w-8 h-8' />
        </a>
      </div>
    </div>
  );
};

export default Socials;
