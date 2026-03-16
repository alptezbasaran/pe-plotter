# -*- coding: utf-8 -*-
"""
Created on Wed Mar  9 17:21:37 2022

@author: Alp Tezbasaran
"""
import plotly.graph_objects as go
import collections

def plot_sankey(source_index, target_index, labels, counts, pe_times, colors, start_time, end_time):
    # Filter data based on the selected time range
    filtered_indices = [i for i, time in enumerate(pe_times) if start_time <= time <= end_time]
    filtered_source_index = [source_index[i] for i in filtered_indices]
    filtered_target_index = [target_index[i] for i in filtered_indices]
    filtered_counts = [counts[i] for i in filtered_indices]

    # Create the Sankey diagram with filtered data
    fig = go.Figure(data=[go.Sankey(
        # [Existing Sankey configuration code with filtered data]
    )])

    fig.update_layout(title_text="Basic Sankey Diagram", font_size=12)
    return fig

def tally(source, target):
  pairs = []
  for pair in zip(source,target):
    pairs.append(pair)
  counter = collections.Counter(pairs)
  final_sources = []
  final_targets = []
  final_counts= []
  for pair in counter.keys():
    final_sources.append(pair[0])
    final_targets.append(pair[1])
  for count in counter.values():
    final_counts.append(count)
  return final_sources,final_targets, final_counts

def convert_to_index(sources, targets, read_times):
  labels = sorted(list(set(sources + targets)))
  pe_times = []
  for label in labels:
    pe_times.append(read_times[label])
  source_index = [labels.index(source) for source in sources]
  target_index = [labels.index(target) for target in targets]

  # make terminal nodes red
  color = []
  for _ in labels:
    if _ in sources:
      color.append("blue")
    else:
      color.append("red")

  return source_index, target_index, labels, pe_times, color


def read_file(filename = "Scenario info.txt"):
  event_sequences = {}
  event_times = {}
  try:
    file = open(filename)
    file.close()
    print("Scenario info file is present")
  except:
    raise Exception("Scenario info.txt file is not found!")

  with open(filename, 'r') as file:
    # for i in range(10000):
    #   line = file.readline()
    for line in file:
      if ("Event" in line and "Hightlights" in line.split()):
        event_sequence = line.split()[-2]
        event_sequences[event_sequence] = []
      else:
        for element in line.split():
          added = False
          if ("(PE_" in element):
            pivotal_event = element[1:-1]
            # add the first pivotal event
            if (len(event_sequences[event_sequence]) == 0):
              event_sequences[event_sequence].append(pivotal_event)
              added = True
            # check if the pivotal event is the same, append if not
            if (len(event_sequences[event_sequence]) > 0 and event_sequences[event_sequence][-1] != pivotal_event):
              event_sequences[event_sequence].append(pivotal_event)
              added = True
          if added:
            event_times[pivotal_event] = float(line.split()[0])
  return event_sequences, event_times

def map_to_sankey(event_sequences):
  source = []
  target = []
  for es in event_sequences:
    for pe in range(len(event_sequences[es])-1):
      # print(pe)
      source.append(event_sequences[es][pe])
      target.append(event_sequences[es][pe+1])
  return source,target

def create_plot_with_slider():
  # Assume you have a way to initialize these variables
  source_index, target_index, labels, pe_times, colors = # [Your data initialization code]

  # Define the range of times for the slider
  min_time, max_time = min(pe_times), max(pe_times)

  # Initial plot with full time range
  fig = plot_sankey(source_index, target_index, labels, counts, pe_times, colors, min_time, max_time)

  # Add slider to the figure
  fig.update_layout(
      sliders=[{
          'steps': [{
              'method': 'update',
              'args': [{'visible': [True]}, {'title': f'Time: {time}'}],
              'label': str(time)
          } for time in range(min_time, max_time + 1)],
          'active': 0,
          'currentvalue': {'prefix': 'Time: '}
      }]
  )

  fig.show()

# Call the function to create and display the plot
create_plot_with_slider()

if __name__ == '__main__':
  alp, alp_times = read_file()
  # alp.popitem()                   # remove the last element
  source, target = map_to_sankey(alp)
  sources, targets, counts = tally(source, target)
  source_index, target_index, labels, pe_times, color = convert_to_index(sources, targets, alp_times)
  plot_sankey(source_index, target_index, labels, counts, pe_times, color)
