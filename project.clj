(defproject markdown-clj "0.9.16"
  :description "Markdown parser"
   :url "https://github.com/yogthos/markdown-clj"
   :license {:name "Eclipse Public License"
             :url "http://www.eclipse.org/legal/epl-v10.html"}
   :dependencies [[org.clojure/clojure "1.4.0"]]
   :plugins [[lein-cljsbuild "0.2.9"]]
   
   :cljsbuild
   {:crossovers [markdown.transformers],
    :builds
    [{:source-path "src-cljs",      
      :compiler {:output-to "js/markdown.js"
                 :optimizations :advanced
                 :pretty-print false}}]})
