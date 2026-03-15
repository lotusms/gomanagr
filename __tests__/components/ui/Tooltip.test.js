/**
 * Unit tests for Tooltip: no content, hover shows tooltip, placement, wrapperClassName, child ref and handlers
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Tooltip from '@/components/ui/Tooltip';

describe('Tooltip', () => {
  it('returns children only when content is falsy', () => {
    const { container } = render(
      <Tooltip content="">
        <span data-testid="child">Trigger</span>
      </Tooltip>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(container.querySelector('[role="tooltip"]')).not.toBeInTheDocument();
  });

  it('returns children when content is null', () => {
    const { container } = render(
      <Tooltip content={null}>
        <span data-testid="child">Trigger</span>
      </Tooltip>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(container.querySelector('[role="tooltip"]')).not.toBeInTheDocument();
  });

  it('shows tooltip on mouseEnter and hides on mouseLeave', () => {
    render(
      <Tooltip content="Full text here">
        <span>Hover me</span>
      </Tooltip>
    );
    const trigger = screen.getByText('Hover me');
    trigger.getBoundingClientRect = () => ({
      left: 100,
      top: 50,
      width: 80,
      height: 20,
      bottom: 70,
      right: 180,
      x: 100,
      y: 50,
      toJSON: () => {},
    });

    expect(document.body.querySelector('[role="tooltip"]')).not.toBeInTheDocument();

    fireEvent.mouseEnter(trigger);
    const tooltip = document.body.querySelector('[role="tooltip"]');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Full text here');

    fireEvent.mouseLeave(trigger);
    expect(document.body.querySelector('[role="tooltip"]')).not.toBeInTheDocument();
  });

  it('positions tooltip above trigger when placement is top', () => {
    render(
      <Tooltip content="Tip" placement="top">
        <span>Trigger</span>
      </Tooltip>
    );
    const trigger = screen.getByText('Trigger');
    trigger.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      width: 50,
      height: 20,
      bottom: 120,
      right: 150,
      x: 100,
      y: 100,
      toJSON: () => {},
    });

    fireEvent.mouseEnter(trigger);
    const tooltip = document.body.querySelector('[role="tooltip"]');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveStyle({ top: '94px' });
  });

  it('positions tooltip below trigger when placement is bottom', () => {
    render(
      <Tooltip content="Tip" placement="bottom">
        <span>Trigger</span>
      </Tooltip>
    );
    const trigger = screen.getByText('Trigger');
    trigger.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      width: 50,
      height: 20,
      bottom: 120,
      right: 150,
      x: 100,
      y: 100,
      toJSON: () => {},
    });

    fireEvent.mouseEnter(trigger);
    const tooltip = document.body.querySelector('[role="tooltip"]');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveStyle({ top: '126px' });
  });

  it('renders with wrapperClassName and attaches hover to wrapper', () => {
    render(
      <Tooltip content="Wrapped tip" wrapperClassName="my-wrapper">
        <span>Inner</span>
      </Tooltip>
    );
    const wrapper = document.querySelector('.my-wrapper');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toContainElement(screen.getByText('Inner'));

    wrapper.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 100,
      height: 30,
      bottom: 30,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    fireEvent.mouseEnter(wrapper);
    expect(document.body.querySelector('[role="tooltip"]')).toHaveTextContent('Wrapped tip');

    fireEvent.mouseLeave(wrapper);
    expect(document.body.querySelector('[role="tooltip"]')).not.toBeInTheDocument();
  });

  it('calls child onMouseEnter and onMouseLeave when provided', () => {
    const onMouseEnter = jest.fn();
    const onMouseLeave = jest.fn();
    render(
      <Tooltip content="Tip">
        <span onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
          Trigger
        </span>
      </Tooltip>
    );
    const trigger = screen.getByText('Trigger');
    trigger.getBoundingClientRect = () => ({ left: 0, top: 0, width: 10, height: 10, bottom: 10, right: 10, x: 0, y: 0, toJSON: () => {} });

    fireEvent.mouseEnter(trigger, { clientX: 5, clientY: 5 });
    expect(onMouseEnter).toHaveBeenCalledTimes(1);

    fireEvent.mouseLeave(trigger);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
  });

  it('merges ref with function ref on child', () => {
    const childRef = jest.fn();
    render(
      <Tooltip content="Tip">
        <span ref={childRef}>Trigger</span>
      </Tooltip>
    );
    expect(childRef).toHaveBeenCalledWith(expect.any(HTMLSpanElement));
  });

  it('merges ref with object ref on child', () => {
    const refObj = { current: null };
    render(
      <Tooltip content="Tip">
        <span ref={refObj}>Trigger</span>
      </Tooltip>
    );
    expect(refObj.current).toBeInstanceOf(HTMLSpanElement);
  });
});
