import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ExploreContainer from '@/components/ExploreContainer.vue';

describe('ExploreContainer.vue', () => {
  it('should render the component', () => {
    const wrapper = mount(ExploreContainer, {
      props: {
        name: 'Test Component'
      }
    });
    
    expect(wrapper.exists()).toBe(true);
  });

  it('should display the name prop', () => {
    const testName = 'My Custom Name';
    const wrapper = mount(ExploreContainer, {
      props: {
        name: testName
      }
    });
    
    expect(wrapper.text()).toContain(testName);
  });

  it('should render the name in a strong tag', () => {
    const testName = 'Test Name';
    const wrapper = mount(ExploreContainer, {
      props: {
        name: testName
      }
    });
    
    const strong = wrapper.find('strong');
    expect(strong.exists()).toBe(true);
    expect(strong.text()).toBe(testName);
  });

  it('should render the UI Components link', () => {
    const wrapper = mount(ExploreContainer, {
      props: {
        name: 'Test'
      }
    });
    
    const link = wrapper.find('a');
    expect(link.exists()).toBe(true);
    expect(link.attributes('href')).toBe('https://ionicframework.com/docs/components');
    expect(link.text()).toBe('UI Components');
  });

  it('should have target="_blank" and rel="noopener noreferrer" on the link', () => {
    const wrapper = mount(ExploreContainer, {
      props: {
        name: 'Test'
      }
    });
    
    const link = wrapper.find('a');
    expect(link.attributes('target')).toBe('_blank');
    expect(link.attributes('rel')).toBe('noopener noreferrer');
  });

  it('should have the container div with correct id', () => {
    const wrapper = mount(ExploreContainer, {
      props: {
        name: 'Test'
      }
    });
    
    const container = wrapper.find('#container');
    expect(container.exists()).toBe(true);
  });

  it('should contain the text "Explore"', () => {
    const wrapper = mount(ExploreContainer, {
      props: {
        name: 'Test'
      }
    });
    
    expect(wrapper.text()).toContain('Explore');
  });

  it('should handle undefined name prop', () => {
    const wrapper = mount(ExploreContainer);
    
    expect(wrapper.exists()).toBe(true);
    const strong = wrapper.find('strong');
    expect(strong.text()).toBe('');
  });

  it('should handle empty string name prop', () => {
    const wrapper = mount(ExploreContainer, {
      props: {
        name: ''
      }
    });
    
    const strong = wrapper.find('strong');
    expect(strong.text()).toBe('');
  });
});
